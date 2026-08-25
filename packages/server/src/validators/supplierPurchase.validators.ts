import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

export const createPurchaseItemSchema = z.object({
  product: objectIdSchema,
  /** SKU de la variante comprada */
  variant: z.string().trim().min(1, "El SKU es requerido"),
  quantity: z.number().int().min(1),
  unitCost: z.number().int().min(0),
});

export const createPurchaseSchema = z.object({
  supplier: z.string().trim().min(1, "El proveedor es requerido"),
  items: z.array(createPurchaseItemSchema).min(1, "Necesita al menos un item"),
  purchaseDate: z.coerce.date().optional(),
  notes: z.string().trim().optional().default(""),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const purchaseQuerySchema = z.object({
  supplier: z.string().trim().optional(),
  product: objectIdSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type PurchaseQuery = z.infer<typeof purchaseQuerySchema>;
