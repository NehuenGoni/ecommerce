import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

const imageSchema = z.object({
  url: z.string().trim().url("URL de imagen inválida"),
  source: z.enum(["cloudinary", "external"]),
  alt: z.string().trim().optional().default(""),
  order: z.number().int().optional().default(0),
});

const variantCreateSchema = z.object({
  sku: z.string().trim().min(1, "El SKU es requerido"),
  name: z.string().trim().min(1, "El nombre de la variante es requerido"),
  price: z.number().int().min(0),
  costPrice: z.number().int().min(0),
  stock: z.number().int().min(0).optional().default(0),
  lowStockThreshold: z.number().int().min(0).optional().default(5),
  weight: z.number().min(0),
  barcode: z.string().trim().optional(),
});

// El stock no se acepta en actualizaciones de catálogo: solo cambia a través
// del módulo de inventario (compras a proveedores, ajustes), para mantener el
// historial de StockMovement como fuente de verdad.
const variantUpdateSchema = variantCreateSchema.omit({ stock: true });

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().optional().default(""),
  shortDescription: z.string().trim().optional().default(""),
  category: objectIdSchema,
  brand: z.string().trim().optional().default(""),
  variants: z.array(variantCreateSchema).min(1, "Necesita al menos una variante"),
  images: z.array(imageSchema).optional().default([]),
  tags: z.array(z.string().trim()).optional().default([]),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().optional(),
  shortDescription: z.string().trim().optional(),
  category: objectIdSchema.optional(),
  brand: z.string().trim().optional(),
  variants: z.array(variantUpdateSchema).min(1, "Necesita al menos una variante").optional(),
  images: z.array(imageSchema).optional(),
  tags: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  tags: z.string().trim().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  isFeatured: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name_asc"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
