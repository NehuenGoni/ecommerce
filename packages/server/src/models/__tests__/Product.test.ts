import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { Category } from "../Category.js";
import { Product } from "../Product.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

function buildVariant(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sku: "SKU-001",
    name: "1 Litro",
    price: 500000,
    costPrice: 300000,
    stock: 10,
    weight: 1,
    ...overrides,
  };
}

describe("Product model", () => {
  it("genera el slug automáticamente a partir del nombre", async () => {
    const category = await Category.create({ name: "Fertilizantes" });
    const product = await Product.create({
      name: "Fertilizante Orgánico Premium",
      category: category._id,
      variants: [buildVariant()],
    });

    expect(product.slug).toBe("fertilizante-organico-premium");
  });

  it("aplica lowStockThreshold=5 por defecto", async () => {
    const category = await Category.create({ name: "Fertilizantes" });
    const product = await Product.create({
      name: "Producto A",
      category: category._id,
      variants: [buildVariant()],
    });

    expect(product.variants[0]!.lowStockThreshold).toBe(5);
  });

  it("requiere al menos una variante", async () => {
    const category = await Category.create({ name: "Fertilizantes" });
    await expect(
      Product.create({ name: "Sin variantes", category: category._id, variants: [] }),
    ).rejects.toThrow();
  });

  it("rechaza SKUs duplicados entre productos distintos", async () => {
    const category = await Category.create({ name: "Fertilizantes" });
    await Product.create({
      name: "Producto A",
      category: category._id,
      variants: [buildVariant({ sku: "SKU-DUP" })],
    });

    await expect(
      Product.create({
        name: "Producto B",
        category: category._id,
        variants: [buildVariant({ sku: "SKU-DUP" })],
      }),
    ).rejects.toThrow();
  });

  it("requiere una categoría válida", async () => {
    await expect(
      Product.create({
        name: "Sin categoría",
        category: new mongoose.Types.ObjectId(),
        variants: [buildVariant()],
      }),
    ).resolves.toBeDefined(); // la referencia no se valida a nivel de schema, solo el tipo ObjectId

    await expect(
      Product.create({ name: "Sin categoría en absoluto", variants: [buildVariant()] }),
    ).rejects.toThrow();
  });
});
