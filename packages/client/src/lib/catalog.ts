import type { ProductImage, ProductVariant } from "@growshop/shared";

export function sortedImages<T extends ProductImage>(images: T[]): T[] {
  return [...images].sort((a, b) => a.order - b.order);
}

export function cheapestVariant<T extends ProductVariant>(variants: T[]): T {
  return variants.reduce((min, v) => (v.price < min.price ? v : min), variants[0]!);
}
