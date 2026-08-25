import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { SupplierPurchase } from "../../models/SupplierPurchase.js";
import { createAdminWithToken, createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function buildProduct(sku = "SKU-SP-1", stock = 10) {
  const category = await Category.create({ name: `Cat ${sku}` });
  return Product.create({
    name: `Producto ${sku}`,
    category: category._id,
    variants: [{ sku, name: "1L", price: 100000, costPrice: 50000, stock, weight: 1 }],
  });
}

describe("POST /api/supplier-purchases", () => {
  it("rechaza si no es admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const res = await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ supplier: "Proveedor SRL", items: [] });
    expect(res.status).toBe(403);
  });

  it("crea la compra y actualiza el stock automáticamente", async () => {
    const { accessToken } = await createAdminWithToken();
    const product = await buildProduct("SKU-SP-1", 10);

    const res = await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        supplier: "Proveedor SRL",
        items: [{ product: product._id.toString(), variant: "SKU-SP-1", quantity: 15, unitCost: 40000 }],
        notes: "Reposición mensual",
      });

    expect(res.status).toBe(201);
    expect(res.body.purchase.items[0].totalCost).toBe(600000);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]!.stock).toBe(25);
  });

  it("rechaza un SKU inexistente y no crea la compra", async () => {
    const { accessToken } = await createAdminWithToken();
    const product = await buildProduct("SKU-SP-2", 10);

    const res = await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        supplier: "Proveedor SRL",
        items: [{ product: product._id.toString(), variant: "SKU-NO-EXISTE", quantity: 5, unitCost: 1000 }],
      });

    expect(res.status).toBe(404);
    const purchases = await SupplierPurchase.find({});
    expect(purchases).toHaveLength(0);
  });
});

describe("GET /api/supplier-purchases", () => {
  it("filtra por proveedor", async () => {
    const { accessToken } = await createAdminWithToken();
    const productA = await buildProduct("SKU-SP-3", 10);
    const productB = await buildProduct("SKU-SP-4", 10);

    await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        supplier: "Growshop Insumos SA",
        items: [{ product: productA._id.toString(), variant: "SKU-SP-3", quantity: 1, unitCost: 1000 }],
      });
    await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        supplier: "Otro Proveedor",
        items: [{ product: productB._id.toString(), variant: "SKU-SP-4", quantity: 1, unitCost: 1000 }],
      });

    const res = await request(app)
      .get("/api/supplier-purchases?supplier=growshop")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].supplier).toBe("Growshop Insumos SA");
  });
});

describe("GET /api/supplier-purchases/:id", () => {
  it("devuelve el detalle poblado", async () => {
    const { accessToken } = await createAdminWithToken();
    const product = await buildProduct("SKU-SP-5", 10);

    const createRes = await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        supplier: "Proveedor SRL",
        items: [{ product: product._id.toString(), variant: "SKU-SP-5", quantity: 3, unitCost: 5000 }],
      });

    const res = await request(app)
      .get(`/api/supplier-purchases/${createRes.body.purchase._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.purchase.items[0].product.name).toBe("Producto SKU-SP-5");
  });
});
