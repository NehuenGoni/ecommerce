import { z } from "zod";

const shippingAddressSchema = z.object({
  label: z.string().trim().optional().default(""),
  street: z.string().trim().min(1, "La calle es requerida"),
  city: z.string().trim().min(1, "La ciudad es requerida"),
  province: z.string().trim().min(1, "La provincia es requerida"),
  zipCode: z.string().trim().min(1, "El código postal es requerido"),
});

export const checkoutSchema = z
  .object({
    shippingAddress: shippingAddressSchema,
    shippingMethod: z.enum(["mercadoenvios", "moto", "pickup"]),
    paymentMethod: z.enum(["mercadopago", "transfer", "cash"]),
    customerNotes: z.string().trim().optional().default(""),
  })
  .refine((data) => !(data.paymentMethod === "cash" && data.shippingMethod === "mercadoenvios"), {
    message: "El pago en efectivo solo está disponible para envío en moto o retiro en punto",
    path: ["paymentMethod"],
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
