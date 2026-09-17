import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

export const IMPORT_STATUSES = [
  "uploaded",
  "extracting",
  "review",
  "applying",
  "applied",
  "failed",
  "discarded",
] as const;

export const importQuerySchema = z.object({
  status: z.enum(IMPORT_STATUSES).optional(),
  supplier: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ImportQuery = z.infer<typeof importQuerySchema>;

/** El campo "supplier" opcional de la carga inicial (multipart): el resto lo completa la extracción. */
export const uploadInvoiceBodySchema = z.object({
  supplier: z.string().trim().optional(),
});
export type UploadInvoiceBody = z.infer<typeof uploadInvoiceBodySchema>;

export const updateImportHeaderSchema = z.object({
  supplier: z.string().trim().min(1).optional(),
  documentNumber: z.string().trim().optional(),
  documentDate: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
});
export type UpdateImportHeaderInput = z.infer<typeof updateImportHeaderSchema>;

const lineDecisionPricingFields = {
  quantity: z.number().int().min(1),
  unitCost: z.number().int().min(0),
  updateCostPrice: z.boolean().optional().default(true),
  updateSalePrice: z.boolean().optional().default(true),
  marginPercent: z.number().min(0).max(1000).nullable().optional().default(null),
  salePrice: z.number().int().min(0).nullable().optional().default(null),
};

/**
 * v1 solo admite "link" (vincular a un producto/variante existente) o
 * "skip" (omitir la línea). Crear un producto nuevo desde una línea sin
 * match es v2 -- ver el plan y la decisión tomada con el usuario.
 */
export const updateLineSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("skip") }),
  z.object({
    action: z.literal("link"),
    product: objectIdSchema,
    variantSku: z.string().trim().min(1),
    ...lineDecisionPricingFields,
  }),
]);
export type UpdateLineInput = z.infer<typeof updateLineSchema>;

export const applyImportSchema = z.object({
  purchaseDate: z.coerce.date().optional(),
  notes: z.string().trim().optional().default(""),
});
export type ApplyImportBody = z.infer<typeof applyImportSchema>;
