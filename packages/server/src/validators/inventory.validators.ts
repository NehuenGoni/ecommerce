import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

export const stockQuerySchema = z.object({
  lowStockOnly: z.coerce.boolean().optional().default(false),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type StockQuery = z.infer<typeof stockQuerySchema>;

export const movementQuerySchema = z.object({
  product: objectIdSchema.optional(),
  type: z.enum(["purchase_in", "sale_out", "adjustment", "return"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type MovementQuery = z.infer<typeof movementQuerySchema>;
