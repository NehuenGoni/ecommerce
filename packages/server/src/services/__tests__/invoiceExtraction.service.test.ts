import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { SupplierInvoiceImport } from "../../models/SupplierInvoiceImport.js";
import { createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

// Se mockea anthropic.service.js completo (no el SDK) -- es más estable y no
// depende de la forma interna de messages.parse. Es el único punto de
// contacto con Anthropic en todo el server.
vi.mock("../anthropic.service.js", () => ({
  extractInvoice: vi.fn(),
  isRetryableExtractionError: vi.fn(() => false),
}));

import { extractInvoice, isRetryableExtractionError, type ExtractInvoiceResult } from "../anthropic.service.js";
import {
  MAX_EXTRACTION_ATTEMPTS,
  recoverStaleExtractionLock,
  runExtraction,
} from "../invoiceExtraction.service.js";
import type { ExtractedInvoice, ExtractedInvoiceLine } from "../prompts/invoiceExtraction.prompt.js";

beforeAll(connectTestDB);
afterEach(async () => {
  vi.resetAllMocks();
  await clearTestDB();
});
afterAll(disconnectTestDB);

const FAKE_FILE = { buffer: Buffer.from("fake"), mimeType: "application/pdf" as const };

let categoryCounter = 0;

async function buildProduct(overrides: Record<string, unknown> = {}) {
  categoryCounter += 1;
  const category = await Category.create({ name: `Categoría ${categoryCounter}` });
  return Product.create({
    name: `Producto ${categoryCounter}`,
    category: category._id,
    variants: [{ sku: "SKU-1", name: "1L", price: 100000, costPrice: 50000, stock: 10, weight: 1 }],
    ...overrides,
  });
}

async function buildImportDoc(overrides: Record<string, unknown> = {}) {
  const { user } = await createUserWithToken();
  return SupplierInvoiceImport.create({
    file: { mimeType: "application/pdf", sizeBytes: 1000, sha256: "sha-" + Math.random() },
    createdBy: user._id,
    ...overrides,
  });
}

function buildExtractedLine(overrides: Partial<ExtractedInvoiceLine> = {}): ExtractedInvoiceLine {
  return {
    description: "Sustrato 50L",
    supplierSku: null,
    barcode: null,
    quantity: 1,
    unit: "u.",
    unitPriceRaw: "600,00",
    unitPriceIncludesTax: false,
    discountPercent: 0,
    taxPercent: 21,
    lineTotalRaw: "600,00",
    confidence: 0.9,
    notes: "",
    ...overrides,
  };
}

function buildExtractionResult(
  lines: ExtractedInvoiceLine[],
  overrides: Partial<ExtractedInvoice> = {},
): ExtractInvoiceResult {
  return {
    data: {
      documentType: "factura",
      supplierName: "Distribuidora Verde SRL",
      supplierTaxId: "30-12345678-9",
      documentNumber: "0001-00001234",
      documentDate: "2026-09-10",
      currency: "ARS",
      lines,
      subtotalRaw: null,
      taxRaw: null,
      totalRaw: null,
      ...overrides,
    },
    usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0 },
    model: "claude-sonnet-5",
    promptVersion: "invoice-extraction-v1",
  };
}

describe("runExtraction (camino feliz)", () => {
  it("matchea por SKU, arma la línea y calcula el precio de venta por margen", async () => {
    await buildProduct(); // SKU-1, costPrice 50000, price 100000
    const doc = await buildImportDoc();

    vi.mocked(extractInvoice).mockResolvedValueOnce(
      buildExtractionResult([buildExtractedLine({ supplierSku: "sku-1" })]),
    );

    await runExtraction(doc._id.toString(), FAKE_FILE);

    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("review");
    expect(updated!.supplier).toBe("Distribuidora Verde SRL");
    expect(updated!.documentType).toBe("factura");
    expect(updated!.extraction.attempts).toBe(1);
    expect(updated!.extraction.model).toBe("claude-sonnet-5");
    expect(updated!.extraction.inputTokens).toBe(1000);

    const line = updated!.lines[0]!;
    expect(line.match.status).toBe("matched");
    expect(line.match.method).toBe("sku");
    expect(line.match.variantSku).toBe("SKU-1");
    expect(line.decision.action).toBe("link");
    expect(line.raw.unitCost).toBe(60000); // "600,00" -> 60000 centavos
    expect(line.decision.updateCostPrice).toBe(true);
    expect(line.decision.updateSalePrice).toBe(true);
    // applyMargin(60000, 60%) = 96000 -> roundUpToStep(96000, 10000) = 100000
    expect(line.decision.salePrice).toBe(100000);
  });

  it("sin match, deja la línea para vincular a mano (action skip)", async () => {
    const doc = await buildImportDoc();
    vi.mocked(extractInvoice).mockResolvedValueOnce(
      buildExtractionResult([buildExtractedLine({ supplierSku: "NO-EXISTE" })]),
    );

    await runExtraction(doc._id.toString(), FAKE_FILE);

    const updated = await SupplierInvoiceImport.findById(doc._id);
    const line = updated!.lines[0]!;
    expect(line.match.status).toBe("unmatched");
    expect(line.decision.action).toBe("skip");
    expect(line.decision.product).toBeNull();
  });

  it("remito sin precio: no marca actualizar costo/precio y prellena con el costo actual", async () => {
    await buildProduct(); // costPrice 50000
    const doc = await buildImportDoc();
    vi.mocked(extractInvoice).mockResolvedValueOnce(
      buildExtractionResult([buildExtractedLine({ supplierSku: "sku-1", unitPriceRaw: null, lineTotalRaw: null })]),
    );

    await runExtraction(doc._id.toString(), FAKE_FILE);

    const updated = await SupplierInvoiceImport.findById(doc._id);
    const line = updated!.lines[0]!;
    expect(line.raw.unitCost).toBeNull();
    expect(line.decision.updateCostPrice).toBe(false);
    expect(line.decision.updateSalePrice).toBe(false);
    expect(line.decision.salePrice).toBeNull();
    expect(line.decision.unitCost).toBe(50000); // costo actual de la variante matcheada, no 0
  });

  it("no pisa el proveedor si ya fue cargado a mano al subir el archivo", async () => {
    const doc = await buildImportDoc({ supplier: "Proveedor Manual" });
    vi.mocked(extractInvoice).mockResolvedValueOnce(
      buildExtractionResult([buildExtractedLine()], { supplierName: "Otro Proveedor SA" }),
    );

    await runExtraction(doc._id.toString(), FAKE_FILE);

    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.supplier).toBe("Proveedor Manual");
  });
});

describe("runExtraction (fallas y reintentos)", () => {
  it("un error no reintentable deja la importación en failed sin reintentar", async () => {
    const doc = await buildImportDoc();
    vi.mocked(isRetryableExtractionError).mockReturnValue(false);
    vi.mocked(extractInvoice).mockRejectedValueOnce(new Error("Archivo corrupto"));

    await runExtraction(doc._id.toString(), FAKE_FILE);

    expect(extractInvoice).toHaveBeenCalledTimes(1);
    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("failed");
    expect(updated!.extraction.lastError).toBe("Archivo corrupto");
    expect(updated!.extraction.attempts).toBe(1);
  });

  it("reintenta una vez ante un error retryable y aplica el resultado del segundo intento", async () => {
    await buildProduct();
    const doc = await buildImportDoc();
    vi.mocked(isRetryableExtractionError).mockReturnValue(true);
    vi.mocked(extractInvoice)
      .mockRejectedValueOnce(new Error("Rate limited"))
      .mockResolvedValueOnce(buildExtractionResult([buildExtractedLine({ supplierSku: "sku-1" })]));

    await runExtraction(doc._id.toString(), FAKE_FILE, { retryBackoffMs: 0 });

    expect(extractInvoice).toHaveBeenCalledTimes(2);
    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("review");
  });

  it("si el reintento también falla, queda failed (nunca más de un reintento automático)", async () => {
    const doc = await buildImportDoc();
    vi.mocked(isRetryableExtractionError).mockReturnValue(true);
    vi.mocked(extractInvoice).mockRejectedValue(new Error("Rate limited"));

    await runExtraction(doc._id.toString(), FAKE_FILE, { retryBackoffMs: 0 });

    expect(extractInvoice).toHaveBeenCalledTimes(2);
    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("failed");
  });

  it("no reintenta si ya alcanzó el máximo de intentos", async () => {
    const doc = await buildImportDoc({ status: "failed", extraction: { attempts: MAX_EXTRACTION_ATTEMPTS } });

    await runExtraction(doc._id.toString(), FAKE_FILE);

    expect(extractInvoice).not.toHaveBeenCalled();
    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("failed");
    expect(updated!.extraction.attempts).toBe(MAX_EXTRACTION_ATTEMPTS);
  });

  it("no hace nada si el documento ya no está en un estado lockeable (ej. ya aplicada)", async () => {
    const doc = await buildImportDoc({ status: "applied" });

    await runExtraction(doc._id.toString(), FAKE_FILE);

    expect(extractInvoice).not.toHaveBeenCalled();
    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("applied");
  });
});

describe("runExtraction (lock optimista)", () => {
  it("dos ejecuciones concurrentes sobre el mismo documento corren la extracción una sola vez", async () => {
    await buildProduct();
    const doc = await buildImportDoc();
    vi.mocked(extractInvoice).mockResolvedValue(buildExtractionResult([buildExtractedLine({ supplierSku: "sku-1" })]));

    await Promise.all([runExtraction(doc._id.toString(), FAKE_FILE), runExtraction(doc._id.toString(), FAKE_FILE)]);

    expect(extractInvoice).toHaveBeenCalledTimes(1);
    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.extraction.attempts).toBe(1);
    expect(updated!.status).toBe("review");
  });
});

describe("recoverStaleExtractionLock", () => {
  it("marca como failed un lock 'extracting' de más de 5 minutos", async () => {
    const doc = await buildImportDoc({
      status: "extracting",
      extraction: { attempts: 1, startedAt: new Date(Date.now() - 10 * 60 * 1000) },
    });

    await recoverStaleExtractionLock(doc._id.toString());

    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("failed");
    expect(updated!.extraction.lastError).toBe("La extracción se interrumpió");
  });

  it("no toca un lock 'extracting' reciente", async () => {
    const doc = await buildImportDoc({
      status: "extracting",
      extraction: { attempts: 1, startedAt: new Date() },
    });

    await recoverStaleExtractionLock(doc._id.toString());

    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("extracting");
  });

  it("no toca un documento que no está extracting", async () => {
    const doc = await buildImportDoc({ status: "review" });

    await recoverStaleExtractionLock(doc._id.toString());

    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("review");
  });
});
