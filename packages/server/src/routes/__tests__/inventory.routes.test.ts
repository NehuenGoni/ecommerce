import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { registerPurchaseStock } from "../../services/inventory.service.js";
import { createAdminWithToken, createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function buildProduct(sku: string, stock: number, lowStockThreshold = 5) {
  const category = await Category.create({ name: `Cat ${sku}` });
  return Product.create({
    name: `Producto ${sku}`,
    category: category._id,
    variants: [{ sku, name: "1L", price: 100000, costPrice: 50000, stock, lowStockThreshold, weight: 1 }],
  });
}

describe("GET /api/inventory/stock", () => {
  it("rechaza si no es admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const res = await request(app)
      .get("/api/inventory/stock")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("devuelve una fila por variante con isLowStock calculado", async () => {
    const { accessToken } = await createAdminWithToken();
    await buildProduct("SKU-LOW", 2, 5); // bajo
    await buildProduct("SKU-OK", 50, 5); // ok

    const res = await request(app)
      .get("/api/inventory/stock")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    const low = res.body.items.find((r: { sku: string }) => r.sku === "SKU-LOW");
    const ok = res.body.items.find((r: { sku: string }) => r.sku === "SKU-OK");
    expect(low.isLowStock).toBe(true);
    expect(ok.isLowStock).toBe(false);
  });

  it("filtra solo stock bajo con lowStockOnly=true", async () => {
    const { accessToken } = await createAdminWithToken();
    await buildProduct("SKU-LOW2", 1, 5);
    await buildProduct("SKU-OK2", 50, 5);

    const res = await request(app)
      .get("/api/inventory/stock?lowStockOnly=true")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].sku).toBe("SKU-LOW2");
  });

  it("busca por nombre de producto o SKU", async () => {
    const { accessToken } = await createAdminWithToken();
    await buildProduct("SKU-ABC", 10);
    await buildProduct("SKU-XYZ", 10);

    const res = await request(app)
      .get("/api/inventory/stock?q=ABC")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].sku).toBe("SKU-ABC");
  });
});

describe("GET /api/inventory/movements", () => {
  it("lista movimientos y filtra por tipo", async () => {
    const { accessToken, user } = await createAdminWithToken();
    const product = await buildProduct("SKU-MOV", 10);
    await registerPurchaseStock(
      [{ productId: product._id.toString(), sku: "SKU-MOV", quantity: 5 }],
      "purchase-x",
      user._id.toString(),
    );

    const res = await request(app)
      .get("/api/inventory/movements?type=purchase_in")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].type).toBe("purchase_in");
    expect(res.body.items[0].product.name).toBe(product.name);
  });

  it("filtra por producto", async () => {
    const { accessToken, user } = await createAdminWithToken();
    const productA = await buildProduct("SKU-A", 10);
    const productB = await buildProduct("SKU-B", 10);
    await registerPurchaseStock(
      [{ productId: productA._id.toString(), sku: "SKU-A", quantity: 1 }],
      "ref-a",
      user._id.toString(),
    );
    await registerPurchaseStock(
      [{ productId: productB._id.toString(), sku: "SKU-B", quantity: 1 }],
      "ref-b",
      user._id.toString(),
    );

    const res = await request(app)
      .get(`/api/inventory/movements?product=${productA._id.toString()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.body.items).toHaveLength(1);
  });
});
