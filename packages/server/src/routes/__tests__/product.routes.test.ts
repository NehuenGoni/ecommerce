import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { Category } from "../../models/Category.js";
import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import { createAdminWithToken, createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function createCategory(name = "Fertilizantes") {
  return Category.create({ name });
}

function buildProductPayload(categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: "Fertilizante Orgánico",
    category: categoryId,
    variants: [
      { sku: "SKU-001", name: "1 Litro", price: 500000, costPrice: 300000, stock: 10, weight: 1 },
    ],
    ...overrides,
  };
}

describe("GET /api/products", () => {
  it("solo muestra productos activos a un visitante anónimo", async () => {
    const category = await createCategory();
    await Product.create(buildProductPayload(category._id.toString()));
    await Product.create(
      buildProductPayload(category._id.toString(), {
        name: "Inactivo",
        isActive: false,
        variants: [{ sku: "SKU-002", name: "1L", price: 100, costPrice: 50, weight: 1 }],
      }),
    );

    const res = await request(app).get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("filtra por rango de precio usando el mínimo entre variantes", async () => {
    const category = await createCategory();
    await Product.create(
      buildProductPayload(category._id.toString(), {
        name: "Barato",
        variants: [{ sku: "SKU-BAR", name: "1L", price: 100000, costPrice: 50000, weight: 1 }],
      }),
    );
    await Product.create(
      buildProductPayload(category._id.toString(), {
        name: "Caro",
        variants: [{ sku: "SKU-CAR", name: "1L", price: 900000, costPrice: 500000, weight: 1 }],
      }),
    );

    const res = await request(app).get("/api/products?minPrice=500000");

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe("Caro");
  });

  it("ordena por precio ascendente", async () => {
    const category = await createCategory();
    await Product.create(
      buildProductPayload(category._id.toString(), {
        name: "Caro",
        variants: [{ sku: "SKU-C", name: "1L", price: 900000, costPrice: 500000, weight: 1 }],
      }),
    );
    await Product.create(
      buildProductPayload(category._id.toString(), {
        name: "Barato",
        variants: [{ sku: "SKU-B", name: "1L", price: 100000, costPrice: 50000, weight: 1 }],
      }),
    );

    const res = await request(app).get("/api/products?sort=price_asc");

    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(["Barato", "Caro"]);
  });

  it("busca por texto en nombre/tags", async () => {
    const category = await createCategory();
    await Product.create(
      buildProductPayload(category._id.toString(), { name: "Sustrato Premium Coco" }),
    );
    await Product.create(
      buildProductPayload(category._id.toString(), {
        name: "Fertilizante Base",
        variants: [{ sku: "SKU-F", name: "1L", price: 100, costPrice: 50, weight: 1 }],
      }),
    );

    const res = await request(app).get("/api/products?q=coco");

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe("Sustrato Premium Coco");
  });

  it("pagina resultados respetando page y limit", async () => {
    const category = await createCategory();
    for (let i = 0; i < 5; i += 1) {
      await Product.create(
        buildProductPayload(category._id.toString(), {
          name: `Producto ${i}`,
          variants: [{ sku: `SKU-${i}`, name: "1L", price: 100, costPrice: 50, weight: 1 }],
        }),
      );
    }

    const res = await request(app).get("/api/products?page=2&limit=2");

    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(5);
    expect(res.body.pages).toBe(3);
  });
});

describe("POST /api/products", () => {
  it("rechaza la creación si el usuario no es admin", async () => {
    const category = await createCategory();
    const { accessToken } = await createUserWithToken("customer");

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(buildProductPayload(category._id.toString()));

    expect(res.status).toBe(403);
  });

  it("crea un producto siendo admin", async () => {
    const category = await createCategory();
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(buildProductPayload(category._id.toString()));

    expect(res.status).toBe(201);
    expect(res.body.product.slug).toBe("fertilizante-organico");
  });

  it("rechaza una categoría inexistente", async () => {
    const { accessToken } = await createAdminWithToken();
    const fakeCategoryId = "656565656565656565656565";

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(buildProductPayload(fakeCategoryId));

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/products/:id — preservación de stock", () => {
  it("ignora el stock enviado en el body y mantiene el stock actual de la DB", async () => {
    const category = await createCategory();
    const { accessToken } = await createAdminWithToken();
    const product = await Product.create(buildProductPayload(category._id.toString()));
    expect(product.variants[0]!.stock).toBe(10);

    const res = await request(app)
      .patch(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        variants: [
          { sku: "SKU-001", name: "1 Litro renombrado", price: 600000, costPrice: 300000, weight: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.product.variants[0].name).toBe("1 Litro renombrado");
    expect(res.body.product.variants[0].price).toBe(600000);
    // el stock no vino en el schema de update: se preserva el valor existente
    expect(res.body.product.variants[0].stock).toBe(10);
  });

  it("una variante nueva agregada en el update arranca con stock 0", async () => {
    const category = await createCategory();
    const { accessToken } = await createAdminWithToken();
    const product = await Product.create(buildProductPayload(category._id.toString()));

    const res = await request(app)
      .patch(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        variants: [
          { sku: "SKU-001", name: "1 Litro", price: 500000, costPrice: 300000, weight: 1 },
          { sku: "SKU-NEW", name: "5 Litros", price: 2000000, costPrice: 1200000, weight: 5 },
        ],
      });

    const newVariant = res.body.product.variants.find((v: { sku: string }) => v.sku === "SKU-NEW");
    expect(newVariant.stock).toBe(0);
  });
});

describe("DELETE /api/products/:id", () => {
  it("rechaza eliminar un producto con pedidos asociados", async () => {
    const category = await createCategory();
    const { accessToken, user } = await createAdminWithToken();
    const product = await Product.create(buildProductPayload(category._id.toString()));

    await Order.create({
      customer: user._id,
      items: [
        {
          product: product._id,
          variant: product.variants[0]!,
          quantity: 1,
          unitPrice: 500000,
          subtotal: 500000,
        },
      ],
      subtotal: 500000,
      shippingCost: 0,
      total: 500000,
      paymentMethod: "cash",
      shippingMethod: "pickup",
      shippingAddress: {
        street: "Calle Falsa 123",
        city: "San Isidro",
        province: "Buenos Aires",
        zipCode: "1642",
      },
    });

    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(409);
  });

  it("elimina un producto sin pedidos asociados", async () => {
    const category = await createCategory();
    const { accessToken } = await createAdminWithToken();
    const product = await Product.create(buildProductPayload(category._id.toString()));

    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    await expect(Product.findById(product._id)).resolves.toBeNull();
  });
});
