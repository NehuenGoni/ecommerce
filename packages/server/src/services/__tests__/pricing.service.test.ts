import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { applyVariantPricing } from "../pricing.service.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

let categoryCounter = 0;

async function buildProduct(overrides: Record<string, unknown> = {}) {
  categoryCounter += 1;
  const category = await Category.create({ name: `Categoría ${categoryCounter}` });
  return Product.create({
    name: "Fertilizante Orgánico",
    category: category._id,
    variants: [
      { sku: "SKU-PRICE-1", name: "1L", price: 100000, costPrice: 50000, stock: 10, weight: 1 },
    ],
    ...overrides,
  });
}

describe("applyVariantPricing", () => {
  it("actualiza costPrice y price de la variante", async () => {
    const product = await buildProduct();

    const ok = await applyVariantPricing(
      { productId: product._id.toString(), sku: "SKU-PRICE-1", costPrice: 60000, price: 120000 },
      "ref-1",
    );

    expect(ok).toBe(true);
    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.costPrice).toBe(60000);
    expect(updated?.variants[0]!.price).toBe(120000);
  });

  it("actualiza solo costPrice si no se pasa price", async () => {
    const product = await buildProduct();

    await applyVariantPricing({ productId: product._id.toString(), sku: "SKU-PRICE-1", costPrice: 70000 }, "ref-2");

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.costPrice).toBe(70000);
    expect(updated?.variants[0]!.price).toBe(100000); // sin cambios
  });

  it("actualiza solo price si no se pasa costPrice", async () => {
    const product = await buildProduct();

    await applyVariantPricing({ productId: product._id.toString(), sku: "SKU-PRICE-1", price: 150000 }, "ref-3");

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.costPrice).toBe(50000); // sin cambios
    expect(updated?.variants[0]!.price).toBe(150000);
  });

  it("no toca nada y devuelve true si no se pasa ni costPrice ni price", async () => {
    const product = await buildProduct();

    const ok = await applyVariantPricing({ productId: product._id.toString(), sku: "SKU-PRICE-1" }, "ref-4");

    expect(ok).toBe(true);
    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.costPrice).toBe(50000);
    expect(updated?.variants[0]!.price).toBe(100000);
  });

  it("devuelve false si el producto no existe", async () => {
    const ok = await applyVariantPricing(
      { productId: "656565656565656565656565", sku: "SKU-PRICE-1", costPrice: 1 },
      "ref-5",
    );
    expect(ok).toBe(false);
  });

  it("devuelve false si el SKU no existe en el producto", async () => {
    const product = await buildProduct();

    const ok = await applyVariantPricing(
      { productId: product._id.toString(), sku: "SKU-INEXISTENTE", costPrice: 1 },
      "ref-6",
    );

    expect(ok).toBe(false);
  });
});
