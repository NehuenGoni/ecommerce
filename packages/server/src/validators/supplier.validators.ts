import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  taxId: z.string().trim().optional().default(""),
  contactName: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  email: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const supplierQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});

export type SupplierQuery = z.infer<typeof supplierQuerySchema>;
