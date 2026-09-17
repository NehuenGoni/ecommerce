import { applyMargin, netFromGross, parseArsAmount, roundUpToStep } from "@growshop/shared";
import { env } from "../config/env.js";
import {
  SupplierInvoiceImport,
  type SupplierInvoiceImportHydratedDocument,
  type SupplierInvoiceImportLine,
} from "../models/SupplierInvoiceImport.js";
import {
  extractInvoice,
  isRetryableExtractionError,
  type ExtractInvoiceInput,
  type ExtractInvoiceResult,
} from "./anthropic.service.js";
import { matchLines, type LineMatchResult } from "./invoiceMatching.service.js";
import type { ExtractedInvoice, ExtractedInvoiceLine } from "./prompts/invoiceExtraction.prompt.js";

/** Cuántas veces se puede intentar extraer una misma importación (contando reintentos manuales vía /retry). Agotado esto, solo queda descartarla. */
export const MAX_EXTRACTION_ATTEMPTS = 3;
/** Espera antes del único reintento automático in-process ante un error transitorio (rate limit, red). */
export const EXTRACTION_RETRY_BACKOFF_MS = 5000;
/** A partir de cuánto tiempo "extracting" se considera un lock huérfano (server reiniciado a mitad de camino). */
export const STALE_EXTRACTION_LOCK_MS = 5 * 60 * 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispara la extracción sin bloquear al caller (mismo patrón que
 * `void sendOrderConfirmationEmail(...)` en checkout.service.ts, pero acá el
 * estado queda persistido en el propio documento en vez de perderse: un
 * fallo no controlado igual deja el registro en "failed" antes de llegar
 * acá, así que este catch es solo para lo verdaderamente inesperado.
 */
export function scheduleExtraction(importId: string, file: ExtractInvoiceInput): void {
  void runExtraction(importId, file).catch((err) => {
    console.error(`[invoiceExtraction] fallo no controlado para ${importId}:`, err);
  });
}

export interface RunExtractionOptions {
  /** Inyectable solo para tests, así el reintento no espera 5s reales de verdad. Producción usa siempre el default. */
  retryBackoffMs?: number;
}

/**
 * Corre la extracción de punta a punta para una importación ya creada.
 * Idempotente: si el documento no está en un estado lockeable (ya está
 * corriendo, ya se aplicó, o agotó los intentos) no hace nada. Exportada
 * (además de `scheduleExtraction`) para que los tests la esperen
 * directamente en vez de correr una carrera contra el fire-and-forget.
 */
export async function runExtraction(
  importId: string,
  file: ExtractInvoiceInput,
  options: RunExtractionOptions = {},
): Promise<void> {
  const locked = await lockForExtraction(importId);
  if (!locked) return;

  try {
    const result = await extractWithRetry(file, options.retryBackoffMs ?? EXTRACTION_RETRY_BACKOFF_MS);
    const lines = await buildLines(result.data);
    await applyExtractionSuccess(locked, result, lines);
  } catch (err) {
    await applyExtractionFailure(importId, err);
  }
}

/**
 * Recupera un lock huérfano: si el server se reinició a mitad de una
 * extracción, el documento queda en "extracting" para siempre. Se llama
 * desde el GET de una importación (antes de devolverla) en vez de con un
 * cron -- el próximo polling del cliente lo descubre solo.
 */
export async function recoverStaleExtractionLock(importId: string): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_EXTRACTION_LOCK_MS);
  await SupplierInvoiceImport.updateOne(
    { _id: importId, status: "extracting", "extraction.startedAt": { $lt: staleBefore } },
    { $set: { status: "failed", "extraction.lastError": "La extracción se interrumpió" } },
  );
}

/**
 * Lock optimista: solo pasa a "extracting" un documento que esté en
 * "uploaded" o "failed" y no haya agotado los intentos. Si no matchea
 * ninguno de los dos (ya está corriendo, ya se aplicó/descartó, o llegó al
 * máximo de intentos) devuelve null y el caller no hace nada -- es lo que
 * hace esto idempotente ante llamadas concurrentes o duplicadas.
 */
async function lockForExtraction(importId: string): Promise<SupplierInvoiceImportHydratedDocument | null> {
  return SupplierInvoiceImport.findOneAndUpdate(
    {
      _id: importId,
      status: { $in: ["uploaded", "failed"] },
      "extraction.attempts": { $lt: MAX_EXTRACTION_ATTEMPTS },
    },
    {
      $set: { status: "extracting", "extraction.startedAt": new Date(), "extraction.lastError": "" },
      $inc: { "extraction.attempts": 1 },
    },
    { new: true },
  );
}

/**
 * Un solo reintento automático, y solo ante un error transitorio (red o
 * rate limit). Un error de otro tipo (archivo corrupto, no configurado)
 * sube tal cual: reintentar lo mismo no lo va a arreglar.
 */
async function extractWithRetry(file: ExtractInvoiceInput, retryBackoffMs: number): Promise<ExtractInvoiceResult> {
  try {
    return await extractInvoice(file);
  } catch (err) {
    if (!isRetryableExtractionError(err)) throw err;
    await delay(retryBackoffMs);
    return await extractInvoice(file);
  }
}

async function buildLines(data: ExtractedInvoice): Promise<SupplierInvoiceImportLine[]> {
  const matches = await matchLines(
    data.lines.map((line) => ({ supplierSku: line.supplierSku ?? "", barcode: line.barcode ?? "" })),
  );

  return data.lines.map((line, index) => buildLine(line, index + 1, matches[index]!));
}

function buildLine(line: ExtractedInvoiceLine, lineNumber: number, match: LineMatchResult): SupplierInvoiceImportLine {
  const unitCost = resolveNetUnitCost(line);
  const hasCost = unitCost !== null;
  // Remito sin precio: se prellena con el costo actual de la variante (si matcheó) para que la
  // pantalla de revisión no arranque en $0, pero NO se marca para actualizar -- ver updateCostPrice.
  const decisionUnitCost = hasCost ? unitCost : (match.currentCostPrice ?? 0);
  const salePrice = hasCost
    ? roundUpToStep(applyMargin(unitCost, env.DEFAULT_MARGIN_PCT), env.PRICE_ROUNDING_STEP)
    : null;

  return {
    lineNumber,
    raw: {
      description: line.description,
      supplierSku: line.supplierSku ?? "",
      barcode: line.barcode ?? "",
      quantity: line.quantity,
      unit: line.unit,
      unitCost,
      taxPercent: line.taxPercent,
      unitCostIncludesTax: line.unitPriceIncludesTax,
      discountPercent: line.discountPercent,
      modelConfidence: line.confidence,
      modelNotes: line.notes,
    },
    match,
    decision: {
      action: match.status === "matched" ? "link" : "skip",
      product: match.product,
      variantSku: match.variantSku,
      quantity: line.quantity,
      unitCost: decisionUnitCost,
      updateCostPrice: hasCost,
      updateSalePrice: hasCost,
      marginPercent: null,
      salePrice,
    },
    result: { ok: false, error: "" },
  };
}

/** Costo unitario NETO (sin IVA) en centavos a partir del string crudo del documento. Null si no informa precio (remito). */
function resolveNetUnitCost(line: ExtractedInvoiceLine): number | null {
  const parsed = parseArsAmount(line.unitPriceRaw ?? "");
  if (parsed === null) return null;
  return line.unitPriceIncludesTax ? netFromGross(parsed, line.taxPercent) : parsed;
}

async function applyExtractionSuccess(
  doc: SupplierInvoiceImportHydratedDocument,
  result: ExtractInvoiceResult,
  lines: SupplierInvoiceImportLine[],
): Promise<void> {
  // Guardia de estado: si mientras Claude respondía el admin descartó la importación (discardImport
  // permite descartar desde "extracting"), este resultado ya tardío no debe resucitarla.
  await SupplierInvoiceImport.updateOne(
    { _id: doc._id, status: "extracting" },
    {
      $set: {
        status: "review",
        // No pisa un proveedor que el admin ya haya cargado a mano al subir el archivo.
        supplier: doc.supplier || result.data.supplierName,
        supplierTaxId: result.data.supplierTaxId ?? "",
        documentType: result.data.documentType,
        documentNumber: result.data.documentNumber ?? "",
        documentDate: result.data.documentDate ? new Date(result.data.documentDate) : null,
        currency: result.data.currency,
        totals: {
          subtotal: parseArsAmount(result.data.subtotalRaw ?? ""),
          tax: parseArsAmount(result.data.taxRaw ?? ""),
          total: parseArsAmount(result.data.totalRaw ?? ""),
        },
        lines,
        "extraction.model": result.model,
        "extraction.promptVersion": result.promptVersion,
        "extraction.completedAt": new Date(),
        "extraction.inputTokens": result.usage.inputTokens,
        "extraction.outputTokens": result.usage.outputTokens,
        "extraction.cacheReadTokens": result.usage.cacheReadTokens,
        "extraction.lastError": "",
      },
    },
  );
}

async function applyExtractionFailure(importId: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  // Misma guardia que applyExtractionSuccess: no pisar un estado al que se pasó por otro lado
  // (ej. discarded) mientras este intento fallaba.
  await SupplierInvoiceImport.updateOne(
    { _id: importId, status: "extracting" },
    { $set: { status: "failed", "extraction.completedAt": new Date(), "extraction.lastError": message } },
  );
}
