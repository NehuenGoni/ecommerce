import { Product } from "../models/Product.js";
import {
  SupplierInvoiceImport,
  type SupplierInvoiceImportHydratedDocument,
  type SupplierInvoiceImportLine,
  type SupplierInvoiceImportLineResult,
} from "../models/SupplierInvoiceImport.js";
import type { SupplierPurchaseHydratedDocument } from "../models/SupplierPurchase.js";
import { BadRequestError, ConflictError } from "../utils/errors.js";
import { applyVariantPricing } from "./pricing.service.js";
import { createPurchase } from "./supplierPurchase.service.js";

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
