import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { createAdminWithToken, createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const validPricing = { marginPercent: 80, roundingStep: 100, autoPriceOnPurchase: true };

describe("GET /api/settings", () => {
  it("devuelve los valores del .env si el admin nunca guardó configuración", async () => {
    const { accessToken } = await createAdminWithToken();

    const res = await request(app).get("/api/settings").set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.settings.pricing).toEqual({ marginPercent: 50, roundingStep: 10000, autoPriceOnPurchase: true });
  });

  it("rechaza a un usuario no admin con 403", async () => {
    const { accessToken } = await createUserWithToken("customer");

    const res = await request(app).get("/api/settings").set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it("rechaza sin token con 401", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/settings/pricing", () => {
  it("guarda la configuración y la devuelve en lecturas posteriores", async () => {
    const { accessToken } = await createAdminWithToken();

    const put = await request(app)
      .put("/api/settings/pricing")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validPricing);
    expect(put.status).toBe(200);
    expect(put.body.settings.pricing).toEqual(validPricing);

    const get = await request(app).get("/api/settings").set("Authorization", `Bearer ${accessToken}`);
    expect(get.body.settings.pricing).toEqual(validPricing);
  });

  it("actualizar dos veces mantiene un único documento", async () => {
    const { accessToken } = await createAdminWithToken();
    const put = (body: object) =>
      request(app).put("/api/settings/pricing").set("Authorization", `Bearer ${accessToken}`).send(body);

    await put(validPricing);
    const second = await put({ ...validPricing, marginPercent: 30 });

    expect(second.status).toBe(200);
    expect(second.body.settings.pricing.marginPercent).toBe(30);
  });

  it.each([
    ["margen negativo", { ...validPricing, marginPercent: -1 }],
    ["margen mayor a 1000", { ...validPricing, marginPercent: 1001 }],
    ["redondeo cero", { ...validPricing, roundingStep: 0 }],
    ["redondeo decimal", { ...validPricing, roundingStep: 10.5 }],
    ["falta el interruptor", { marginPercent: 50, roundingStep: 100 }],
  ])("rechaza con 400: %s", async (_name, body) => {
    const { accessToken } = await createAdminWithToken();

    const res = await request(app).put("/api/settings/pricing").set("Authorization", `Bearer ${accessToken}`).send(body);

    expect(res.status).toBe(400);
  });

  it("rechaza a un usuario no admin con 403", async () => {
    const { accessToken } = await createUserWithToken("customer");

    const res = await request(app)
      .put("/api/settings/pricing")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validPricing);

    expect(res.status).toBe(403);
  });
});

describe("configuración aplicada a las compras", () => {
  async function postPurchase(accessToken: string, productId: string) {
    return request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        supplier: "Proveedor",
        purchaseDate: new Date().toISOString(),
        items: [{ product: productId, variant: "SKU-SET-1", quantity: 5, unitCost: 10000 }],
      });
  }

  async function buildProduct() {
    const category = await Category.create({ name: "Cat settings" });
    return Product.create({
      name: "Producto settings",
      category: category._id,
      variants: [{ sku: "SKU-SET-1", name: "1L", price: 50000, costPrice: 5000, stock: 0, weight: 1 }],
    });
  }

  it("usa el margen y redondeo guardados por el admin", async () => {
    const { accessToken } = await createAdminWithToken();
    const product = await buildProduct();
    await request(app)
      .put("/api/settings/pricing")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ marginPercent: 80, roundingStep: 100, autoPriceOnPurchase: true });

    const res = await postPurchase(accessToken, product._id.toString());

    expect(res.status).toBe(201);
    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.costPrice).toBe(10000);
    expect(updated?.variants[0]!.price).toBe(18000); // 10000 + 80%
  });

  it("con autoPriceOnPurchase en false solo actualiza el costo", async () => {
    const { accessToken } = await createAdminWithToken();
    const product = await buildProduct();
    await request(app)
      .put("/api/settings/pricing")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validPricing, autoPriceOnPurchase: false });

    const res = await postPurchase(accessToken, product._id.toString());

    expect(res.status).toBe(201);
    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.costPrice).toBe(10000);
    expect(updated?.variants[0]!.price).toBe(50000); // intacto
  });
});
