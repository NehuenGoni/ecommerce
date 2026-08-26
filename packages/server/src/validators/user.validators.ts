import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es requerido").optional(),
  lastName: z.string().trim().min(1, "El apellido es requerido").optional(),
  phone: z.string().trim().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addressInputSchema = z.object({
  label: z.string().trim().optional().default(""),
  street: z.string().trim().min(1, "La calle es requerida"),
  city: z.string().trim().min(1, "La ciudad es requerida"),
  province: z.string().trim().min(1, "La provincia es requerida"),
  zipCode: z.string().trim().min(1, "El código postal es requerido"),
  isDefault: z.boolean().optional().default(false),
});

export type AddressInput = z.infer<typeof addressInputSchema>;
