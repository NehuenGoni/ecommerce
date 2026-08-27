import { z } from "zod";

export const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
});

export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1, "El token es requerido"),
  firstName: z.string().trim().min(1, "El nombre es requerido"),
  lastName: z.string().trim().min(1, "El apellido es requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
