import type { Types } from "mongoose";
import { Product } from "../models/Product.js";
import type { LineMatchMethod, LineMatchStatus } from "../models/SupplierInvoiceImport.js";

/**
 * Matching determinístico y del lado nuestro -- el LLM no elige productos,
 * ni en v1 ni en v2 (ver plan), así que esto es testeable sin red y no
 * puede alucinar un producto equivocado.
 *
 * v1 solo hace match exacto, en cascada con corte temprano:
 *   1. Barcode exacto
 *   2. SKU normalizado exacto
 *   3. Sin match -> el admin vincula a mano desde la pantalla de revisión
 *
 * El matching por texto ($text, el índice en español ya existe en
 * Product.ts) con scoring y candidatos queda para v2.
 */

export interface LineMatchInput {
  supplierSku: string;
  barcode: string;
}

export interface LineMatchResult {
  status: LineMatchStatus;
  method: LineMatchMethod;
  product: Types.ObjectId | null;
  variantSku: string;
  /** Precios actuales de la variante matcheada, en centavos, para mostrar el delta sin queries extra. */
  currentCostPrice: number | null;
  currentPrice: number | null;
}

const UNMATCHED: Readonly<LineMatchResult> = Object.freeze({
  status: "unmatched",
  method: "none",
  product: null,
  variantSku: "",
  currentCostPrice: null,
  currentPrice: null,
});

/**
 * Normaliza un SKU para comparar el nuestro contra el del proveedor sin que
 * el formato exacto importe: mayúsculas, sin espacios, guiones, puntos ni
 * barras. Ej: "sus-50 L" y "SUS50L" normalizan igual.
 */
export function normalizeSku(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s\-./]/g, "");
}

interface CatalogEntry {
  product: Types.ObjectId;
  variantSku: string;
  costPrice: number;
  price: number;
}

interface CatalogVariantProjection {
  sku: string;
  barcode?: string;
  costPrice: number;
  price: number;
}

interface CatalogProductProjection {
  _id: Types.ObjectId;
  variants: CatalogVariantProjection[];
}

function toMatch(entry: CatalogEntry, method: "barcode" | "sku"): LineMatchResult {
  return {
    status: "matched",
    method,
    product: entry.product,
    variantSku: entry.variantSku,
    currentCostPrice: entry.costPrice,
    currentPrice: entry.price,
  };
}

/**
 * Resuelve el match de una tanda de líneas en un solo viaje a la base: trae
 * el catálogo completo una única vez (es un growshop, son cientos de SKUs,
 * no millones) y arma dos índices en memoria antes de resolver cada línea.
 * El orden del resultado espeja el de `inputs`.
 */
export async function matchLines(inputs: LineMatchInput[]): Promise<LineMatchResult[]> {
  const products = await Product.find()
    .select("variants.sku variants.barcode variants.costPrice variants.price")
    .lean<CatalogProductProjection[]>();

  const bySku = new Map<string, CatalogEntry>();
  const byBarcode = new Map<string, CatalogEntry>();

  for (const product of products) {
    for (const variant of product.variants) {
      const entry: CatalogEntry = {
        product: product._id,
        variantSku: variant.sku,
        costPrice: variant.costPrice,
        price: variant.price,
      };
      bySku.set(normalizeSku(variant.sku), entry);
      if (variant.barcode) byBarcode.set(variant.barcode, entry);
    }
  }

  return inputs.map((input) => {
    const byBarcodeEntry = input.barcode ? byBarcode.get(input.barcode) : undefined;
    if (byBarcodeEntry) return toMatch(byBarcodeEntry, "barcode");

    const bySkuEntry = input.supplierSku ? bySku.get(normalizeSku(input.supplierSku)) : undefined;
    if (bySkuEntry) return toMatch(bySkuEntry, "sku");

    return { ...UNMATCHED };
  });
}
