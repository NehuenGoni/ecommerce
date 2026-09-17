import { createHash } from "node:crypto";
import type { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { SupplierInvoiceImport, type SupplierInvoiceImportLine } from "../../models/SupplierInvoiceImport.js";
import { SupplierPurchase } from "../../models/SupplierPurchase.js";
import { createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { applyImport, createImport } from "../invoiceImport.service.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

let categoryCounter = 0;

async function buildProduct(sku: string, overrides: Record<string, unknown> = {}) {
  categoryCounter += 1;
  const category = await Category.create({ name: `Categoría ${categoryCounter}` });
  return Product.create({
    name: `Producto ${categoryCounter}`,
    category: category._id,
    variants: [{ sku, name: "1L", price: 100000, costPrice: 50000, stock: 10, weight: 1 }],
    ...overrides,
  });
}

function linkedLine(
  product: { _id: Types.ObjectId },
  variantSku: string,
  opts: Partial<{
    lineNumber: number;
    quantity: number;
    unitCost: number;
    updateCostPrice: boolean;
    updateSalePrice: boolean;
    salePrice: number | null;
  }> = {},
): SupplierInvoiceImportLine {
  const quantity = opts.quantity ?? 5;
  const unitCost = opts.unitCost ?? 60000;
  return {
    lineNumber: opts.lineNumber ?? 1,
    raw: {
      description: "Sustrato 50L",
      supplierSku: variantSku,
      barcode: "",
      quantity,
      unit: "u.",
      unitCost,
      taxPercent: 21,
      unitCostIncludesTax: false,
      discountPercent: 0,
      modelConfidence: 0.9,
      modelNotes: "",
    },
    match: {
      status: "matched",
      method: "sku",
      product: product._id,
      variantSku,
      currentCostPrice: 50000,
      currentPrice: 100000,
    },
    decision: {
      action: "link",
      product: product._id,
      variantSku,
      quantity,
      unitCost,
      updateCostPrice: opts.updateCostPrice ?? true,
      updateSalePrice: opts.updateSalePrice ?? true,
      marginPercent: null,
      salePrice: opts.salePrice ?? 100000,
    },
    result: { ok: false, error: "" },
  };
}

function skippedLine(lineNumber = 2): SupplierInvoiceImportLine {
  return {
    lineNumber,
    raw: {
      description: "Percepción IIBB",
      supplierSku: "",
      barcode: "",
      quantity: 0,
      unit: "",
      unitCost: null,
      taxPercent: 0,
      unitCostIncludesTax: false,
      discountPercent: 0,
      modelConfidence: 0.5,
      modelNotes: "",
    },
    match: { status: "unmatched", method: "none", product: null, variantSku: "", currentCostPrice: null, currentPrice: null },
    decision: {
      action: "skip",
      product: null,
      variantSku: "",
      quantity: 0,
      unitCost: 0,
      updateCostPrice: false,
      updateSalePrice: false,
      marginPercent: null,
      salePrice: null,
    },
    result: { ok: false, error: "" },
  };
}

async function buildImportDoc(overrides: Record<string, unknown> = {}) {
  const { user } = await createUserWithToken();
  return SupplierInvoiceImport.create({
    file: { mimeType: "application/pdf", sizeBytes: 1000, sha256: "sha-" + Math.random() },
    status: "review",
    supplier: "Distribuidora Verde SRL",
    createdBy: user._id,
    lines: [],
    ...overrides,
  });
}

describe("createImport", () => {
  it("crea la importación con el hash del archivo, en estado uploaded", async () => {
    const { user } = await createUserWithToken();
    const buffer = Buffer.from("contenido de prueba");

    const doc = await createImport(
      { buffer, mimeType: "application/pdf", originalName: "factura.pdf", sizeBytes: buffer.length, supplier: "Proveedor X" },
      user._id.toString(),
    );

    expect(doc.status).toBe("uploaded");
    expect(doc.supplier).toBe("Proveedor X");
    expect(doc.file.sizeBytes).toBe(buffer.length);
    expect(doc.file.sha256).toBe(createHash("sha256").update(buffer).digest("hex"));
  });

  it("rechaza el mismo contenido si ya existe una importación en un estado no terminal", async () => {
    // Se arma el documento "ya existente" directo por el modelo (no vía createImport): ese helper
    // dispara su propia extracción en segundo plano, que -- sin ANTHROPIC_API_KEY en test -- corre
    // y reintenta lo bastante rápido como para pisar cualquier status que el test fije a mano.
    const { user } = await createUserWithToken();
    const buffer = Buffer.from("misma factura");
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    await SupplierInvoiceImport.create({
      file: { mimeType: "application/pdf", sizeBytes: buffer.length, sha256 },
      status: "review",
      createdBy: user._id,
    });

    await expect(
      createImport(
        { buffer, mimeType: "application/pdf", originalName: "b.pdf", sizeBytes: buffer.length },
        user._id.toString(),
      ),
    ).rejects.toThrow();
  });

  it("permite subir el mismo contenido si la importación anterior está failed o discarded", async () => {
    const { user } = await createUserWithToken();
    const buffer = Buffer.from("factura que falló");
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    await SupplierInvoiceImport.create({
      file: { mimeType: "application/pdf", sizeBytes: buffer.length, sha256 },
      status: "failed",
      createdBy: user._id,
    });

    const doc = await createImport(
      { buffer, mimeType: "application/pdf", originalName: "b.pdf", sizeBytes: buffer.length },
      user._id.toString(),
    );
    expect(doc.status).toBe("uploaded");
  });
});

describe("applyImport (camino feliz)", () => {
  it("crea la compra, mueve stock y actualiza costo y precio de la variante", async () => {
    const product = await buildProduct("SKU-IMP-1");
    const doc = await buildImportDoc({ lines: [linkedLine(product, "SKU-IMP-1")] });

    const { user } = await createUserWithToken();
    const result = await applyImport(doc._id.toString(), {}, user._id.toString());

    expect(result.purchase.supplier).toBe("Distribuidora Verde SRL");
    expect(result.purchase.items).toHaveLength(1);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]!.stock).toBe(15); // 10 + 5
    expect(updatedProduct?.variants[0]!.costPrice).toBe(60000);
    expect(updatedProduct?.variants[0]!.price).toBe(100000);

    const updatedImport = await SupplierInvoiceImport.findById(doc._id);
    expect(updatedImport!.status).toBe("applied");
    expect(updatedImport!.purchase?.toString()).toBe(result.purchase._id.toString());
    expect(updatedImport!.appliedAt).not.toBeNull();
    expect(updatedImport!.lines[0]!.result.ok).toBe(true);
    expect(updatedImport!.lines[0]!.result.error).toBe("");
  });

  it("respeta updateCostPrice/updateSalePrice en false: mueve stock pero no toca precios", async () => {
    const product = await buildProduct("SKU-IMP-2");
    const doc = await buildImportDoc({
      lines: [linkedLine(product, "SKU-IMP-2", { updateCostPrice: false, updateSalePrice: false })],
    });

    const { user } = await createUserWithToken();
    await applyImport(doc._id.toString(), {}, user._id.toString());

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]!.stock).toBe(15);
    expect(updatedProduct?.variants[0]!.costPrice).toBe(50000); // sin cambios
    expect(updatedProduct?.variants[0]!.price).toBe(100000); // sin cambios
  });

  it("ignora las líneas marcadas como skip", async () => {
    const product = await buildProduct("SKU-IMP-3");
    const doc = await buildImportDoc({
      lines: [linkedLine(product, "SKU-IMP-3", { lineNumber: 1 }), skippedLine(2)],
    });

    const { user } = await createUserWithToken();
    const result = await applyImport(doc._id.toString(), {}, user._id.toString());

    expect(result.purchase.items).toHaveLength(1);

    const updatedImport = await SupplierInvoiceImport.findById(doc._id);
    expect(updatedImport!.lines[1]!.result.ok).toBe(false); // línea skip, sin tocar
    expect(updatedImport!.lines[1]!.result.error).toBe("");
  });

  it("pasa purchaseDate y notes al crear la compra", async () => {
    const product = await buildProduct("SKU-IMP-4");
    const doc = await buildImportDoc({ lines: [linkedLine(product, "SKU-IMP-4")] });

    const { user } = await createUserWithToken();
    const purchaseDate = new Date("2026-01-15");
    const result = await applyImport(doc._id.toString(), { purchaseDate, notes: "Cargado desde factura escaneada" }, user._id.toString());

    expect(result.purchase.purchaseDate.toISOString()).toBe(purchaseDate.toISOString());
    expect(result.purchase.notes).toBe("Cargado desde factura escaneada");
  });
});

describe("applyImport (validaciones y fallas)", () => {
  it("rechaza si no hay ninguna línea vinculada y no crea ninguna compra", async () => {
    const doc = await buildImportDoc({ lines: [skippedLine(1)] });
    const { user } = await createUserWithToken();

    await expect(applyImport(doc._id.toString(), {}, user._id.toString())).rejects.toThrow();

    expect(await SupplierPurchase.countDocuments()).toBe(0);
    const updatedImport = await SupplierInvoiceImport.findById(doc._id);
    expect(updatedImport!.status).toBe("review"); // vuelve a review, no queda en "applying"
  });

  it("rechaza si la importación no tiene proveedor cargado", async () => {
    const product = await buildProduct("SKU-IMP-5");
    const doc = await buildImportDoc({ supplier: "", lines: [linkedLine(product, "SKU-IMP-5")] });
    const { user } = await createUserWithToken();

    await expect(applyImport(doc._id.toString(), {}, user._id.toString())).rejects.toThrow();

    expect(await SupplierPurchase.countDocuments()).toBe(0);
    const updatedImport = await SupplierInvoiceImport.findById(doc._id);
    expect(updatedImport!.status).toBe("review");
  });

  it("rechaza si una línea vinculada apunta a un producto que ya no existe, sin crear la compra", async () => {
    const product = await buildProduct("SKU-IMP-6");
    await product.deleteOne(); // el producto se borró después de que se armó la línea
    const doc = await buildImportDoc({ lines: [linkedLine(product, "SKU-IMP-6")] });
    const { user } = await createUserWithToken();

    await expect(applyImport(doc._id.toString(), {}, user._id.toString())).rejects.toThrow();

    expect(await SupplierPurchase.countDocuments()).toBe(0);
    const updatedImport = await SupplierInvoiceImport.findById(doc._id);
    expect(updatedImport!.status).toBe("review");
  });

  it("rechaza si una línea vinculada apunta a un SKU que ya no existe en el producto", async () => {
    const product = await buildProduct("SKU-IMP-7");
    const doc = await buildImportDoc({ lines: [linkedLine(product, "SKU-QUE-NO-EXISTE")] });
    const { user } = await createUserWithToken();

    await expect(applyImport(doc._id.toString(), {}, user._id.toString())).rejects.toThrow();
    expect(await SupplierPurchase.countDocuments()).toBe(0);
  });

  it("aplicar dos veces la misma importación rechaza la segunda vez (idempotencia)", async () => {
    const product = await buildProduct("SKU-IMP-8");
    const doc = await buildImportDoc({ lines: [linkedLine(product, "SKU-IMP-8")] });
    const { user } = await createUserWithToken();

    await applyImport(doc._id.toString(), {}, user._id.toString());

    await expect(applyImport(doc._id.toString(), {}, user._id.toString())).rejects.toThrow();
    expect(await SupplierPurchase.countDocuments()).toBe(1); // no se creó una segunda compra
  });

  it("rechaza una importación que todavía está en extracción", async () => {
    const doc = await buildImportDoc({ status: "extracting" });
    const { user } = await createUserWithToken();

    await expect(applyImport(doc._id.toString(), {}, user._id.toString())).rejects.toThrow();
    expect(await SupplierPurchase.countDocuments()).toBe(0);
  });
});
