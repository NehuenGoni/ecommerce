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

describe("GET /api/categories", () => {
  it("solo muestra categorías activas a un visitante anónimo", async () => {
    await Category.create({ name: "Activa" });
    await Category.create({ name: "Inactiva", isActive: false });

    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(1);
    expect(res.body.categories[0].name).toBe("Activa");
  });

  it("muestra todas las categorías a un admin con includeInactive=true", async () => {
    await Category.create({ name: "Activa" });
    await Category.create({ name: "Inactiva", isActive: false });
    const { accessToken } = await createAdminWithToken();

    const res = await request(app)
      .get("/api/categories?includeInactive=true")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.body.categories).toHaveLength(2);
  });
});

describe("POST /api/categories", () => {
  it("rechaza la creación sin autenticación", async () => {
    const res = await request(app).post("/api/categories").send({ name: "Fertilizantes" });
    expect(res.status).toBe(401);
  });

  it("rechaza la creación si el usuario no es admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Fertilizantes" });
    expect(res.status).toBe(403);
  });

  it("crea una categoría siendo admin", async () => {
    const { accessToken } = await createAdminWithToken();
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Fertilizantes" });

    expect(res.status).toBe(201);
    expect(res.body.category.slug).toBe("fertilizantes");
  });
});

describe("DELETE /api/categories/:id", () => {
  it("rechaza eliminar una categoría con subcategorías", async () => {
    const { accessToken } = await createAdminWithToken();
    const parent = await Category.create({ name: "Padre" });
    await Category.create({ name: "Hijo", parent: parent._id });

    const res = await request(app)
      .delete(`/api/categories/${parent._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(409);
  });

  it("rechaza eliminar una categoría con productos asociados", async () => {
    const { accessToken } = await createAdminWithToken();
    const category = await Category.create({ name: "Con productos" });
    await Product.create({
      name: "Producto",
      category: category._id,
      variants: [
        { sku: "SKU-1", name: "1L", price: 100, costPrice: 50, weight: 1, stock: 5 },
      ],
    });

    const res = await request(app)
      .delete(`/api/categories/${category._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(409);
  });

  it("elimina una categoría sin dependencias", async () => {
    const { accessToken } = await createAdminWithToken();
    const category = await Category.create({ name: "Sin dependencias" });

    const res = await request(app)
      .delete(`/api/categories/${category._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    await expect(Category.findById(category._id)).resolves.toBeNull();
  });
});

describe("PATCH /api/categories/reorder", () => {
  it("actualiza el order de varias categorías de una", async () => {
    const { accessToken } = await createAdminWithToken();
    const a = await Category.create({ name: "A", order: 0 });
    const b = await Category.create({ name: "B", order: 1 });

    const res = await request(app)
      .patch("/api/categories/reorder")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        items: [
          { id: a._id.toString(), order: 5 },
          { id: b._id.toString(), order: 1 },
        ],
      });

    expect(res.status).toBe(204);
    const updated = await Category.findById(a._id);
    expect(updated?.order).toBe(5);
  });
});
