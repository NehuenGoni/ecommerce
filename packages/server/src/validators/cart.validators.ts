import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

export const syncCartSchema = z.object({
  items: z.array(
    z.object({
      productId: objectIdSchema,
      variantSku: z.string().trim().min(1),
      quantity: z.number().int().min(1),
    }),
  ),
});

export type SyncCartInput = z.infer<typeof syncCartSchema>;

export const setCartItemSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().trim().min(1),
  quantity: z.number().int().min(0),
});

export type SetCartItemInput = z.infer<typeof setCartItemSchema>;
