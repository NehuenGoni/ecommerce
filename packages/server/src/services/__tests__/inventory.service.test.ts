import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { StockMovement } from "../../models/StockMovement.js";
import { createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { decrementStock, registerPurchaseStock, restoreStock } from "../inventory.service.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

let categoryCounter = 0;

async function buildProduct(overrides: Record<string, unknown> = {}) {
  categoryCounter += 1;
  const category = await Category.create({ name: `Fertilizantes ${categoryCounter}` });
  return Product.create({
    name: "Fertilizante Orgánico",
    category: category._id,
    variants: [
      { sku: "SKU-INV-1", name: "1L", price: 100000, costPrice: 50000, stock: 10, weight: 1 },
    ],
    ...overrides,
  });
}

describe("decrementStock", () => {
  it("descuenta el stock y registra un StockMovement sale_out", async () => {
    const product = await buildProduct();
    const { user } = await createUserWithToken();

    await decrementStock(
      [{ productId: product._id.toString(), sku: "SKU-INV-1", quantity: 3 }],
      "order-ref-1",
      user._id.toString(),
    );

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.stock).toBe(7);

    const movement = await StockMovement.findOne({ product: product._id });
    expect(movement?.type).toBe("sale_out");
    expect(movement?.quantity).toBe(-3);
    expect(movement?.previousStock).toBe(10);
    expect(movement?.newStock).toBe(7);
  });

  it("rechaza si no hay stock suficiente y no descuenta nada", async () => {
    const product = await buildProduct();
    const { user } = await createUserWithToken();

    await expect(
      decrementStock(
        [{ productId: product._id.toString(), sku: "SKU-INV-1", quantity: 999 }],
        "order-ref-2",
        user._id.toString(),
      ),
    ).rejects.toThrow();

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.stock).toBe(10);
  });

  it("revierte los items ya descontados si uno falla a mitad de camino", async () => {
    const productA = await buildProduct();
    const productB = await buildProduct({
      name: "Producto B",
      variants: [{ sku: "SKU-INV-2", name: "1L", price: 100000, costPrice: 50000, stock: 2, weight: 1 }],
    });
    const { user } = await createUserWithToken();

    await expect(
      decrementStock(
        [
          { productId: productA._id.toString(), sku: "SKU-INV-1", quantity: 5 }, // ok
          { productId: productB._id.toString(), sku: "SKU-INV-2", quantity: 999 }, // falla
        ],
        "order-ref-3",
        user._id.toString(),
      ),
    ).rejects.toThrow();

    const revertedA = await Product.findById(productA._id);
    expect(revertedA?.variants[0]!.stock).toBe(10); // se revirtió el descuento
  });
});

describe("restoreStock", () => {
  it("suma stock y registra un StockMovement return", async () => {
    const product = await buildProduct();
    const { user } = await createUserWithToken();

    await restoreStock(
      [{ productId: product._id.toString(), sku: "SKU-INV-1", quantity: 4 }],
      "order-ref-4",
      user._id.toString(),
    );

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.stock).toBe(14);

    const movement = await StockMovement.findOne({ product: product._id, type: "return" });
    expect(movement?.quantity).toBe(4);
  });

  it("ignora en silencio un producto que ya no existe", async () => {
    const { user } = await createUserWithToken();
    await expect(
      restoreStock(
        [{ productId: "656565656565656565656565", sku: "SKU-X", quantity: 1 }],
        "order-ref-5",
        user._id.toString(),
      ),
    ).resolves.not.toThrow();
  });
});

describe("registerPurchaseStock", () => {
  it("suma stock y registra un StockMovement purchase_in", async () => {
    const product = await buildProduct();
    const { user } = await createUserWithToken();

    await registerPurchaseStock(
      [{ productId: product._id.toString(), sku: "SKU-INV-1", quantity: 20 }],
      "purchase-ref-1",
      user._id.toString(),
    );

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]!.stock).toBe(30);

    const movement = await StockMovement.findOne({ product: product._id, type: "purchase_in" });
    expect(movement?.quantity).toBe(20);
    expect(movement?.previousStock).toBe(10);
    expect(movement?.newStock).toBe(30);
  });

  it("rechaza (no ignora) un producto/SKU inexistente", async () => {
    const { user } = await createUserWithToken();
    await expect(
      registerPurchaseStock(
        [{ productId: "656565656565656565656565", sku: "SKU-X", quantity: 1 }],
        "purchase-ref-2",
        user._id.toString(),
      ),
    ).rejects.toThrow();
  });
});
