import type { ProductVariant } from "@growshop/shared";

export function emptyVariant(): ProductVariant {
  return { sku: "", name: "", price: 0, costPrice: 0, stock: 0, lowStockThreshold: 5, weight: 0, barcode: "" };
}
