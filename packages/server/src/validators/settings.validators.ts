import { z } from "zod";

export const updatePricingSettingsSchema = z.object({
  marginPercent: z.number().min(0, "El margen no puede ser negativo").max(1000, "El margen máximo es 1000%"),
  roundingStep: z.number().int("El redondeo debe ser un número entero de centavos").min(1, "El redondeo debe ser al menos 1 centavo"),
  autoPriceOnPurchase: z.boolean(),
});

export type UpdatePricingSettingsInput = z.infer<typeof updatePricingSettingsSchema>;
