import type { ID, Timestamps } from "./common.js";

export type ImageSource = "cloudinary" | "external";

export interface ProductImage {
  url: string;
  source: ImageSource;
  alt: string;
  order: number;
}

export interface ProductVariant {
  sku: string;
  name: string;
  /** Precio de venta, en centavos (ARS) */
  price: number;
  /** Precio de compra al proveedor, en centavos. Solo visible en admin. */
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  weight: number;
  barcode?: string;
}

export interface Product extends Timestamps {
  _id: ID;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: ID;
  brand: string;
  variants: ProductVariant[];
  images: ProductImage[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
}
