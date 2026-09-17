import { describe, expect, it } from "vitest";
import { InvoiceExtractionNotConfiguredError, extractInvoice } from "../anthropic.service.js";

// ANTHROPIC_API_KEY no está seteado en el entorno de test (ver vitest.config.ts):
// getClient() devuelve null. A diferencia de email.service (canal secundario
// que hace no-op en silencio), acá SÍ hay que enterarse: invoiceExtraction.service
// necesita este error para marcar la importación como "failed" con un mensaje
// claro, en vez de quedarse "extracting" para siempre.
describe("anthropic.service (ANTHROPIC_API_KEY no configurado en test)", () => {
  it("extractInvoice rechaza con InvoiceExtractionNotConfiguredError sin tocar la red", async () => {
    await expect(
      extractInvoice({ buffer: Buffer.from("%PDF-1.4 fake"), mimeType: "application/pdf" }),
    ).rejects.toThrow(InvoiceExtractionNotConfiguredError);
  });
});
