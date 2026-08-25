import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function buildProduct(stock = 10) {
  const category = await Category.create({ name: "Fertilizantes" });
  return Product.create({
    name: "Fertilizante Orgánico",
    category: category._id,
    variants: [{ sku: "SKU-CART-1", name: "1L", price: 100000, costPrice: 50000, stock, weight: 1 }],
  });
}

describe("cart endpoints", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.status).toBe(401);
  });

  it("devuelve un carrito vacío para un usuario nuevo", async () => {
    const { accessToken } = await createUserWithToken();
    const res = await request(app).get("/api/cart").set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.subtotal).toBe(0);
  });

  it("PATCH /items agrega un item y calcula el subtotal", async () => {
    const product = await buildProduct();
    const { accessToken } = await createUserWithToken();

    const res = await request(app)
      .patch("/api/cart/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ productId: product._id.toString(), variantSku: "SKU-CART-1", quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
    expect(res.body.subtotal).toBe(300000);
    expect(res.body.adjustedQuantity).toBe(3);
  });

  it("PATCH /items recorta la cantidad si supera el stock disponible", async () => {
    const product = await buildProduct(2);
    const { accessToken } = await createUserWithToken();

    const res = await request(app)
      .patch("/api/cart/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ productId: product._id.toString(), variantSku: "SKU-CART-1", quantity: 10 });

    expect(res.body.adjustedQuantity).toBe(2);
    expect(res.body.items[0].quantity).toBe(2);
  });

  it("PATCH /items con quantity 0 elimina el item", async () => {
    const product = await buildProduct();
    const { accessToken } = await createUserWithToken();
    await request(app)
      .patch("/api/cart/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ productId: product._id.toString(), variantSku: "SKU-CART-1", quantity: 3 });

    const res = await request(app)
      .patch("/api/cart/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ productId: product._id.toString(), variantSku: "SKU-CART-1", quantity: 0 });

    expect(res.body.items).toEqual([]);
  });

  it("DELETE /items/:productId/:variantSku remueve el item", async () => {
    const product = await buildProduct();
    const { accessToken } = await createUserWithToken();
    await request(app)
      .patch("/api/cart/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ productId: product._id.toString(), variantSku: "SKU-CART-1", quantity: 1 });

    const res = await request(app)
      .delete(`/api/cart/items/${product._id.toString()}/SKU-CART-1`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.body.items).toEqual([]);
  });

  it("PUT / sincroniza el carrito completo y reporta ajustes por falta de stock", async () => {
    const product = await buildProduct(1);
    const { accessToken } = await createUserWithToken();

    const res = await request(app)
      .put("/api/cart")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ items: [{ productId: product._id.toString(), variantSku: "SKU-CART-1", quantity: 5 }] });

    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(1);
    expect(res.body.adjustments).toHaveLength(1);
    expect(res.body.adjustments[0].reason).toBe("insufficient_stock");
  });

  it("DELETE / vacía el carrito", async () => {
    const product = await buildProduct();
    const { accessToken } = await createUserWithToken();
    await request(app)
      .patch("/api/cart/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ productId: product._id.toString(), variantSku: "SKU-CART-1", quantity: 1 });

    const clearRes = await request(app)
      .delete("/api/cart")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(clearRes.status).toBe(204);

    const getRes = await request(app).get("/api/cart").set("Authorization", `Bearer ${accessToken}`);
    expect(getRes.body.items).toEqual([]);
  });
});
