import { createHash } from "node:crypto";
import { Types, type FilterQuery } from "mongoose";
import { Product } from "../models/Product.js";
import {
  SupplierInvoiceImport,
  type SupplierInvoiceImportDocument,
  type SupplierInvoiceImportHydratedDocument,
  type SupplierInvoiceImportLine,
  type SupplierInvoiceImportLineDecision,
  type SupplierInvoiceImportLineResult,
} from "../models/SupplierInvoiceImport.js";
import type { SupplierPurchaseHydratedDocument } from "../models/SupplierPurchase.js";
import type { PaginatedResult } from "../utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors.js";
import type {
  ImportQuery,
  UpdateImportHeaderInput,
  UpdateLineInput,
} from "../validators/supplierInvoiceImport.validators.js";
import type { SupportedMimeType } from "./anthropic.service.js";
import { archiveInvoiceFile } from "./invoiceArchive.service.js";
import { recoverStaleExtractionLock, scheduleExtraction } from "./invoiceExtraction.service.js";
import { applyVariantPricing } from "./pricing.service.js";
import { createPurchase } from "./supplierPurchase.service.js";

export interface CreateImportInput {
  buffer: Buffer;
  mimeType: SupportedMimeType;
  originalName: string;
  sizeBytes: number;
  /** Si el admin ya conoce al proveedor al subir el archivo; si no, lo completa la extracción. */
  supplier?: string;
}

/**
 * Estados que bloquean volver a subir la misma factura (mismo hash de
 * contenido): cualquiera salvo "failed" y "discarded". Así un doble click
 * mientras todavía se está extrayendo no crea dos importaciones de la misma
 * factura, y a la vez re-subir después de una falla (o de descartarla)
 * funciona sin fricción -- es el mecanismo de "reintentar" de v1, no hay un
 * endpoint /retry dedicado (ver nota en el plan: reintentar de verdad sin
 * volver a subir el archivo requeriría releer los bytes desde Cloudinary,
 * que queda para más adelante).
 */
const DUPLICATE_BLOCKING_STATUSES = ["uploaded", "extracting", "review", "applying", "applied"] as const;

/**
 * Recibe el archivo ya en memoria (subido vía multer), lo archiva en
 * Cloudinary como comprobante, crea el documento de staging y dispara la
 * extracción en segundo plano. La IA todavía no intervino en nada del
 * catálogo en este punto.
 */
export async function createImport(
  input: CreateImportInput,
  createdBy: string,
): Promise<SupplierInvoiceImportHydratedDocument> {
  const sha256 = createHash("sha256").update(input.buffer).digest("hex");

  const duplicate = await SupplierInvoiceImport.findOne({
    "file.sha256": sha256,
    status: { $in: DUPLICATE_BLOCKING_STATUSES },
  });
  if (duplicate) {
    throw new ConflictError(`Esta factura ya fue cargada (importación ${duplicate._id.toString()})`);
  }

  const archived = await archiveInvoiceFile(input.buffer, input.originalName);

  const doc = await SupplierInvoiceImport.create({
    file: {
      url: archived.url,
      publicId: archived.publicId,
      resourceType: archived.resourceType,
      mimeType: input.mimeType,
      originalName: input.originalName,
      sizeBytes: input.sizeBytes,
      sha256,
    },
    supplier: input.supplier ?? "",
    createdBy,
  });

  scheduleExtraction(doc._id.toString(), { buffer: input.buffer, mimeType: input.mimeType });

  return doc;
}

export async function listImports(query: ImportQuery): Promise<PaginatedResult<SupplierInvoiceImportHydratedDocument>> {
  const filter: FilterQuery<SupplierInvoiceImportDocument> = {};
  if (query.status) filter.status = query.status;
  if (query.supplier) filter.supplier = { $regex: query.supplier, $options: "i" };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    SupplierInvoiceImport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    SupplierInvoiceImport.countDocuments(filter),
  ]);

  return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}

/**
 * Antes de devolver el documento, intenta recuperar un lock de extracción
 * huérfano (server reiniciado a mitad de camino) -- así el próximo
 * polling del cliente lo descubre solo, sin necesitar un cron.
 */
export async function getImportById(id: string): Promise<SupplierInvoiceImportHydratedDocument> {
  await recoverStaleExtractionLock(id);
  const doc = await SupplierInvoiceImport.findById(id);
  if (!doc) throw new NotFoundError("Importación no encontrada");
  return doc;
}

export async function updateImportHeader(
  id: string,
  input: UpdateImportHeaderInput,
): Promise<SupplierInvoiceImportHydratedDocument> {
  const doc = await SupplierInvoiceImport.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!doc) throw new NotFoundError("Importación no encontrada");
  return doc;
}

/**
 * Solo se puede editar una línea mientras la importación está en "review":
 * antes de eso todavía no hay líneas (o se están por sobreescribir), y
 * después ya se aplicó (o se está aplicando) y editarla no tendría efecto
 * real. No vuelve a validar contra el catálogo acá -- eso ya lo hace
 * applyImport de forma robusta al confirmar, y hacerlo también acá
 * significaría una consulta extra por cada tecla que guarde el admin.
 */
export async function updateLine(
  importId: string,
  lineNumber: number,
  input: UpdateLineInput,
): Promise<SupplierInvoiceImportHydratedDocument> {
  const doc = await SupplierInvoiceImport.findById(importId);
  if (!doc) throw new NotFoundError("Importación no encontrada");
  if (doc.status !== "review") {
    throw new ConflictError("Solo se pueden editar líneas mientras la importación está en revisión");
  }
  const lineExists = doc.lines.some((line) => line.lineNumber === lineNumber);
  if (!lineExists) {
    throw new NotFoundError(`Línea ${lineNumber} no encontrada`);
  }

  const updated = await SupplierInvoiceImport.findOneAndUpdate(
    { _id: importId, "lines.lineNumber": lineNumber },
    { $set: { "lines.$.decision": toLineDecision(input) } },
    { new: true },
  );
  return updated!;
}

function toLineDecision(input: UpdateLineInput): SupplierInvoiceImportLineDecision {
  if (input.action === "skip") {
    return {
      action: "skip",
      product: null,
      variantSku: "",
      quantity: 0,
      unitCost: 0,
      updateCostPrice: false,
      updateSalePrice: false,
      marginPercent: null,
      salePrice: null,
    };
  }
  return {
    action: "link",
    // objectIdSchema ya validó el formato -- convertirlo acá evita pasar un string donde el tipo
    // declarado (y Mongoose, en runtime) esperan un ObjectId real.
    product: new Types.ObjectId(input.product),
    variantSku: input.variantSku,
    quantity: input.quantity,
    unitCost: input.unitCost,
    updateCostPrice: input.updateCostPrice,
    updateSalePrice: input.updateSalePrice,
    marginPercent: input.marginPercent,
    salePrice: input.salePrice,
  };
}

/** Descarta una importación (no la borra). Una vez aplicada -- o mientras se está aplicando -- ya no se puede descartar. */
export async function discardImport(id: string): Promise<void> {
  const updated = await SupplierInvoiceImport.findOneAndUpdate(
    { _id: id, status: { $nin: ["applying", "applied", "discarded"] } },
    { $set: { status: "discarded" } },
  );
  if (!updated) {
    throw new ConflictError("La importación no se puede descartar en su estado actual");
  }
}

export interface ApplyImportInput {
  purchaseDate?: Date;
  notes?: string;
}

export interface ApplyImportResult {
  import: SupplierInvoiceImportHydratedDocument;
  purchase: SupplierPurchaseHydratedDocument;
}

/**
 * Confirma una importación: crea la SupplierPurchase real (que ya sabe mover
 * stock, ver supplierPurchase.service.ts::createPurchase) y actualiza el
 * costo/precio de cada variante vinculada. La IA nunca llegó a tocar el
 * catálogo -- recién acá, con la revisión humana ya hecha, se aplica algo
 * real.
 *
 * Lock optimista igual que la extracción: solo se puede aplicar una
 * importación en "review", y queda en "applying" mientras dura -- eso evita
 * que un doble click cree dos compras. Cualquier falla dentro (validación, o
 * el propio createPurchase) devuelve el documento a "review" para que el
 * admin corrija y reintente; nunca queda trabado en "applying".
 */
export async function applyImport(
  importId: string,
  input: ApplyImportInput,
  userId: string,
): Promise<ApplyImportResult> {
  const locked = await SupplierInvoiceImport.findOneAndUpdate(
    { _id: importId, status: "review" },
    { $set: { status: "applying" } },
    { new: true },
  );
  if (!locked) {
    throw new ConflictError(
      "La importación no está lista para aplicarse (¿ya se aplicó, se está extrayendo, o fue descartada?)",
    );
  }

  try {
    return await doApply(locked, input, userId);
  } catch (err) {
    await revertToReview(importId);
    throw err;
  }
}

async function doApply(
  locked: SupplierInvoiceImportHydratedDocument,
  input: ApplyImportInput,
  userId: string,
): Promise<ApplyImportResult> {
  const linesToApply = locked.lines.filter((line) => line.decision.action === "link");
  if (linesToApply.length === 0) {
    throw new BadRequestError("La importación necesita al menos una línea vinculada a un producto para aplicarse");
  }
  if (!locked.supplier) {
    throw new BadRequestError("La importación necesita un proveedor antes de aplicarse");
  }

  // Validación propia (además de la que createPurchase ya hace internamente): nos deja atribuir
  // el error a la línea puntual de la factura, en vez de un mensaje genérico de todo el lote.
  await assertLinesStillExistInCatalog(linesToApply);

  const purchase = await createPurchase(
    {
      supplier: locked.supplier,
      items: linesToApply.map((line) => ({
        product: line.decision.product!.toString(),
        variant: line.decision.variantSku,
        quantity: line.decision.quantity,
        unitCost: line.decision.unitCost,
      })),
      purchaseDate: input.purchaseDate,
      notes: input.notes ?? "",
    },
    userId,
  );

  // El stock ya se movió acá (createPurchase salió bien): una falla de precio en una línea puntual
  // no debe deshacer la compra. Se refleja en result.error de esa línea, no como excepción.
  const resultByLine = await applyPricingForLines(linesToApply, locked._id.toString());

  // `.toObject()` en el documento raíz (no en cada subdocumento) para tener líneas planas y
  // spreadables -- los subdocumentos de Mongoose no están tipados con sus propios métodos acá.
  const updatedLines: SupplierInvoiceImportLine[] = locked.toObject().lines.map((line) => {
    if (line.decision.action !== "link") return line;
    return { ...line, result: resultByLine.get(line.lineNumber)! };
  });

  const updated = await SupplierInvoiceImport.findOneAndUpdate(
    { _id: locked._id },
    { $set: { status: "applied", purchase: purchase._id, appliedAt: new Date(), lines: updatedLines } },
    { new: true },
  );

  return { import: updated!, purchase };
}

async function assertLinesStillExistInCatalog(lines: SupplierInvoiceImportLine[]): Promise<void> {
  const productIds = [...new Set(lines.map((line) => line.decision.product!.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  for (const line of lines) {
    const product = productById.get(line.decision.product!.toString());
    const variantExists = product?.variants.some((v) => v.sku === line.decision.variantSku);
    if (!product || !variantExists) {
      throw new BadRequestError(
        `Línea ${line.lineNumber} ("${line.raw.description}"): el producto o la variante ya no existen en el catálogo`,
      );
    }
  }
}

async function applyPricingForLines(
  lines: SupplierInvoiceImportLine[],
  reference: string,
): Promise<Map<number, SupplierInvoiceImportLineResult>> {
  const results = new Map<number, SupplierInvoiceImportLineResult>();

  for (const line of lines) {
    const update: { productId: string; sku: string; costPrice?: number; price?: number } = {
      productId: line.decision.product!.toString(),
      sku: line.decision.variantSku,
    };
    if (line.decision.updateCostPrice) update.costPrice = line.decision.unitCost;
    if (line.decision.updateSalePrice && line.decision.salePrice !== null) update.price = line.decision.salePrice;

    const ok = await applyVariantPricing(update, reference);
    results.set(
      line.lineNumber,
      ok ? { ok: true, error: "" } : { ok: false, error: "No se pudo actualizar el precio: la variante ya no existe" },
    );
  }

  return results;
}

async function revertToReview(importId: string): Promise<void> {
  await SupplierInvoiceImport.updateOne({ _id: importId, status: "applying" }, { $set: { status: "review" } });
}
