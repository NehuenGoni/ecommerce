import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().optional().default(""),
  image: z.string().trim().optional().default(""),
  parent: objectIdSchema.nullable().optional(),
  order: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({
  items: z
    .array(z.object({ id: objectIdSchema, order: z.number().int() }))
    .min(1, "Necesita al menos un item"),
});

export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export const categoryQuerySchema = z.object({
  parent: z.string().trim().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});

export type CategoryQuery = z.infer<typeof categoryQuerySchema>;
