import { createHash } from "node:crypto";
import type { Types } from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { SupplierInvoiceImport, type SupplierInvoiceImportLine } from "../../models/SupplierInvoiceImport.js";
import { createAdminWithToken, createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const FAKE_PDF = Buffer.from("%PDF-1.4 fake invoice content");

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

function linkedLine(product: { _id: Types.ObjectId }, variantSku: string, lineNumber = 1): SupplierInvoiceImportLine {
  return {
    lineNumber,
    raw: {
      description: "Sustrato 50L",
      supplierSku: variantSku,
      barcode: "",
      quantity: 5,
      unit: "u.",
      unitCost: 60000,
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
      quantity: 5,
      unitCost: 60000,
      updateCostPrice: true,
      updateSalePrice: true,
      marginPercent: null,
      salePrice: 100000,
    },
    result: { ok: false, error: "" },
  };
}

function skippedLine(lineNumber = 1): SupplierInvoiceImportLine {
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

describe("POST /api/supplier-invoices", () => {
  it("rechaza si no es admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const res = await request(app)
      .post("/api/supplier-invoices")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("file", FAKE_PDF, { filename: "factura.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(403);
  });

  it("rechaza un mime no soportado", async () => {
    const { accessToken } = await createAdminWithToken();
    const res = await request(app)
      .post("/api/supplier-invoices")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("file", Buffer.from("hola"), { filename: "notas.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });

  it("rechaza si no se adjunta ningún archivo", async () => {
    const { accessToken } = await createAdminWithToken();
    const res = await request(app).post("/api/supplier-invoices").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  it("crea la importación con un PDF válido", async () => {
    const { accessToken } = await createAdminWithToken();
    const res = await request(app)
      .post("/api/supplier-invoices")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("supplier", "Distribuidora Verde SRL")
      .attach("file", FAKE_PDF, { filename: "factura.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    expect(res.body.import.status).toBe("uploaded");
    expect(res.body.import.supplier).toBe("Distribuidora Verde SRL");
    expect(res.body.import.file.mimeType).toBe("application/pdf");
    expect(res.body.import.file.sizeBytes).toBe(FAKE_PDF.length);
  });

  it("rechaza una factura que ya fue cargada (mismo contenido) mientras la anterior sigue en curso", async () => {
    // El documento "ya existente" se arma directo por el modelo, no subiéndolo por HTTP: una
    // subida real dispara su propia extracción en segundo plano que, sin ANTHROPIC_API_KEY en
    // test, corre y reintenta lo bastante rápido como para pisar cualquier estado fijado a mano
    // después. Construirlo aparte hace la prueba del bloqueo de duplicados determinística.
    const { user, accessToken } = await createAdminWithToken();
    const sha256 = createHash("sha256").update(FAKE_PDF).digest("hex");
    await SupplierInvoiceImport.create({
      file: { mimeType: "application/pdf", sizeBytes: FAKE_PDF.length, sha256 },
      status: "review",
      createdBy: user._id,
    });

    const res = await request(app)
      .post("/api/supplier-invoices")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("file", FAKE_PDF, { filename: "factura.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(409);
  });

  it("permite volver a subir la misma factura después de que la anterior falló (reintento vía re-subida)", async () => {
    // Mismo motivo que el test anterior: el doc "failed" se arma directo por el modelo. Subirlo
    // primero por HTTP y forzar el status a mano a continuación es inherentemente racy -- ese
    // primer upload dispara su propia extracción real en segundo plano (sin ANTHROPIC_API_KEY en
    // test) que puede re-lockear el mismo documento ("failed" es un estado válido para reintentar)
    // justo en la ventana en la que corre el segundo request.
    const { user, accessToken } = await createAdminWithToken();
    const sha256 = createHash("sha256").update(FAKE_PDF).digest("hex");
    await SupplierInvoiceImport.create({
      file: { mimeType: "application/pdf", sizeBytes: FAKE_PDF.length, sha256 },
      status: "failed",
      createdBy: user._id,
    });

    const res = await request(app)
      .post("/api/supplier-invoices")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("file", FAKE_PDF, { filename: "factura.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
  });
});

describe("GET /api/supplier-invoices", () => {
  it("filtra por status", async () => {
    await buildImportDoc({ status: "review" });
    await buildImportDoc({ status: "failed" });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .get("/api/supplier-invoices?status=failed")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].status).toBe("failed");
  });
});

describe("GET /api/supplier-invoices/:id", () => {
  it("devuelve el detalle con pricingDefaults y fileUrl", async () => {
    const doc = await buildImportDoc();
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .get(`/api/supplier-invoices/${doc._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.import._id).toBe(doc._id.toString());
    expect(res.body.pricingDefaults).toEqual({ marginPercent: 60, roundingStep: 10000 });
    expect(res.body.fileUrl).toBe(""); // sin Cloudinary configurado en test
  });

  it("recupera un lock de extracción huérfano al leerlo", async () => {
    const doc = await buildImportDoc({
      status: "extracting",
      extraction: { attempts: 1, startedAt: new Date(Date.now() - 10 * 60 * 1000) },
    });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .get(`/api/supplier-invoices/${doc._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.body.import.status).toBe("failed");
  });

  it("devuelve 404 si no existe", async () => {
    const { accessToken } = await createAdminWithToken();
    const res = await request(app)
      .get("/api/supplier-invoices/656565656565656565656565")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/supplier-invoices/:id", () => {
  it("actualiza el proveedor y las notas", async () => {
    const doc = await buildImportDoc();
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .patch(`/api/supplier-invoices/${doc._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ supplier: "Otro Proveedor SA", notes: "Factura con descuento" });

    expect(res.status).toBe(200);
    expect(res.body.import.supplier).toBe("Otro Proveedor SA");
    expect(res.body.import.notes).toBe("Factura con descuento");
  });
});

describe("PATCH /api/supplier-invoices/:id/lines/:lineNumber", () => {
  it("vincula una línea a un producto y variante", async () => {
    const product = await buildProduct("SKU-ROUTE-1");
    const doc = await buildImportDoc({ lines: [skippedLine(1)] });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .patch(`/api/supplier-invoices/${doc._id}/lines/1`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        action: "link",
        product: product._id.toString(),
        variantSku: "SKU-ROUTE-1",
        quantity: 3,
        unitCost: 45000,
      });

    expect(res.status).toBe(200);
    const line = res.body.import.lines[0];
    expect(line.decision.action).toBe("link");
    expect(line.decision.variantSku).toBe("SKU-ROUTE-1");
    expect(line.decision.quantity).toBe(3);
  });

  it("rechaza un body 'link' sin producto (unión discriminada)", async () => {
    const doc = await buildImportDoc({ lines: [skippedLine(1)] });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .patch(`/api/supplier-invoices/${doc._id}/lines/1`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ action: "link", quantity: 3, unitCost: 45000 });

    expect(res.status).toBe(400);
  });

  it("rechaza editar una línea si la importación no está en revisión", async () => {
    const doc = await buildImportDoc({ status: "applied", lines: [skippedLine(1)] });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .patch(`/api/supplier-invoices/${doc._id}/lines/1`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ action: "skip" });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/supplier-invoices/:id/apply", () => {
  it("aplica de punta a punta: crea la compra y mueve stock y precio", async () => {
    const product = await buildProduct("SKU-ROUTE-2");
    const doc = await buildImportDoc({ lines: [linkedLine(product, "SKU-ROUTE-2")] });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .post(`/api/supplier-invoices/${doc._id}/apply`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.purchase.supplier).toBe("Distribuidora Verde SRL");
    expect(res.body.import.status).toBe("applied");

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]!.stock).toBe(15);
    expect(updatedProduct?.variants[0]!.costPrice).toBe(60000);
  });

  it("rechaza aplicar dos veces la misma importación", async () => {
    const product = await buildProduct("SKU-ROUTE-3");
    const doc = await buildImportDoc({ lines: [linkedLine(product, "SKU-ROUTE-3")] });
    const { accessToken } = await createAdminWithToken();

    await request(app)
      .post(`/api/supplier-invoices/${doc._id}/apply`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    const res = await request(app)
      .post(`/api/supplier-invoices/${doc._id}/apply`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/supplier-invoices/:id", () => {
  it("descarta una importación en revisión", async () => {
    const doc = await buildImportDoc({ status: "review" });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .delete(`/api/supplier-invoices/${doc._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    const updated = await SupplierInvoiceImport.findById(doc._id);
    expect(updated!.status).toBe("discarded");
  });

  it("no permite descartar una importación ya aplicada", async () => {
    const doc = await buildImportDoc({ status: "applied" });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .delete(`/api/supplier-invoices/${doc._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(409);
  });
});
