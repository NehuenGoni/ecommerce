import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { matchLines, normalizeSku } from "../invoiceMatching.service.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

let categoryCounter = 0;

async function buildProduct(overrides: Record<string, unknown> = {}) {
  categoryCounter += 1;
  const category = await Category.create({ name: `Categoría ${categoryCounter}` });
  return Product.create({
    name: `Producto ${categoryCounter}`,
    category: category._id,
    variants: [{ sku: "SKU-1", name: "1L", price: 100000, costPrice: 50000, stock: 10, weight: 1 }],
    ...overrides,
  });
}

describe("normalizeSku", () => {
  it("ignora mayúsculas, espacios, guiones, puntos y barras", () => {
    expect(normalizeSku("sku-1")).toBe("SKU1");
    expect(normalizeSku("SKU1")).toBe("SKU1");
    expect(normalizeSku(" S.K.U/1 ")).toBe("SKU1");
  });
});

describe("matchLines", () => {
  it("matchea por SKU normalizado", async () => {
    const product = await buildProduct();

    const [result] = await matchLines([{ supplierSku: "sku-1", barcode: "" }]);

    expect(result).toMatchObject({
      status: "matched",
      method: "sku",
      variantSku: "SKU-1",
      currentCostPrice: 50000,
      currentPrice: 100000,
    });
    expect(result!.product?.toString()).toBe(product._id.toString());
  });

  it("matchea por barcode exacto", async () => {
    const product = await buildProduct({
      variants: [
        { sku: "SKU-2", name: "1L", price: 80000, costPrice: 40000, stock: 5, weight: 1, barcode: "7791234567890" },
      ],
    });

    const [result] = await matchLines([{ supplierSku: "", barcode: "7791234567890" }]);

    expect(result).toMatchObject({ status: "matched", method: "barcode", variantSku: "SKU-2" });
    expect(result!.product?.toString()).toBe(product._id.toString());
  });

  it("el barcode gana sobre el SKU cuando ambos matchean productos distintos", async () => {
    await buildProduct({ variants: [{ sku: "SKU-A", name: "1L", price: 1, costPrice: 1, stock: 1, weight: 1 }] });
    const byBarcode = await buildProduct({
      variants: [
        { sku: "SKU-B", name: "1L", price: 1, costPrice: 1, stock: 1, weight: 1, barcode: "7790000000001" },
      ],
    });

    // La línea trae el SKU de un producto y el barcode de otro: debería ganar el barcode.
    const [result] = await matchLines([{ supplierSku: "SKU-A", barcode: "7790000000001" }]);

    expect(result!.method).toBe("barcode");
    expect(result!.product?.toString()).toBe(byBarcode._id.toString());
  });

  it("devuelve unmatched cuando no hay SKU ni barcode que coincidan", async () => {
    await buildProduct();

    const [result] = await matchLines([{ supplierSku: "NO-EXISTE", barcode: "" }]);

    expect(result).toEqual({
      status: "unmatched",
      method: "none",
      product: null,
      variantSku: "",
      currentCostPrice: null,
      currentPrice: null,
    });
  });

  it("devuelve unmatched cuando la línea no trae ni SKU ni barcode", async () => {
    await buildProduct();

    const [result] = await matchLines([{ supplierSku: "", barcode: "" }]);

    expect(result!.status).toBe("unmatched");
  });

  it("resuelve varias líneas en un solo llamado, respetando el orden de entrada", async () => {
    await buildProduct({ variants: [{ sku: "SKU-X", name: "1L", price: 1, costPrice: 1, stock: 1, weight: 1 }] });
    await buildProduct({ variants: [{ sku: "SKU-Y", name: "1L", price: 1, costPrice: 1, stock: 1, weight: 1 }] });

    const results = await matchLines([
      { supplierSku: "sku-y", barcode: "" },
      { supplierSku: "no-existe", barcode: "" },
      { supplierSku: "sku-x", barcode: "" },
    ]);

    expect(results.map((r) => r.status)).toEqual(["matched", "unmatched", "matched"]);
    expect(results[0]!.variantSku).toBe("SKU-Y");
    expect(results[2]!.variantSku).toBe("SKU-X");
  });
});
