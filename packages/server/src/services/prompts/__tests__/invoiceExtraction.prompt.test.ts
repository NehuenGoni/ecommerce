import { describe, expect, it } from "vitest";
import { extractedInvoiceSchema } from "../invoiceExtraction.prompt.js";

function validLine(overrides: Record<string, unknown> = {}) {
  return {
    description: "Sustrato 50L",
    supplierSku: "SUS-50",
    barcode: null,
    quantity: 10,
    unit: "u.",
    unitPriceRaw: "1.234,56",
    unitPriceIncludesTax: false,
    discountPercent: 0,
    taxPercent: 21,
    lineTotalRaw: "12.345,60",
    confidence: 0.95,
    notes: "",
    ...overrides,
  };
}

function validInvoice(overrides: Record<string, unknown> = {}) {
  return {
    documentType: "factura",
    supplierName: "Distribuidora Verde SRL",
    supplierTaxId: "30-12345678-9",
    documentNumber: "0001-00001234",
    documentDate: "2026-09-10",
    currency: "ARS",
    lines: [validLine()],
    subtotalRaw: "12.345,60",
    taxRaw: "2.592,58",
    totalRaw: "14.938,18",
    ...overrides,
  };
}

describe("extractedInvoiceSchema", () => {
  it("acepta una factura bien formada", () => {
    const result = extractedInvoiceSchema.safeParse(validInvoice());
    expect(result.success).toBe(true);
  });

  it("acepta un remito sin precios (unitPriceRaw null)", () => {
    const result = extractedInvoiceSchema.safeParse(
      validInvoice({
        documentType: "remito",
        lines: [validLine({ unitPriceRaw: null, lineTotalRaw: null })],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rechaza un documentType fuera del enum", () => {
    const result = extractedInvoiceSchema.safeParse(validInvoice({ documentType: "ticket" }));
    expect(result.success).toBe(false);
  });

  it("rechaza si falta un campo requerido en una línea", () => {
    const invalidLine = validLine();
    delete (invalidLine as Record<string, unknown>).quantity;
    const result = extractedInvoiceSchema.safeParse(validInvoice({ lines: [invalidLine] }));
    expect(result.success).toBe(false);
  });

  it("rechaza una currency que no sea ARS o USD", () => {
    const result = extractedInvoiceSchema.safeParse(validInvoice({ currency: "EUR" }));
    expect(result.success).toBe(false);
  });
});
