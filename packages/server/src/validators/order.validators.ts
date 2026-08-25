import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

const orderStatusEnum = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const orderQuerySchema = z.object({
  status: orderStatusEnum.optional(),
  paymentMethod: z.enum(["mercadopago", "transfer", "cash"]).optional(),
  customer: objectIdSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type OrderQuery = z.infer<typeof orderQuerySchema>;

export const myOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type MyOrdersQuery = z.infer<typeof myOrdersQuerySchema>;

export const changeOrderStatusSchema = z.object({
  status: orderStatusEnum,
  note: z.string().trim().optional().default(""),
});

export type ChangeOrderStatusInput = z.infer<typeof changeOrderStatusSchema>;

export const setTrackingSchema = z.object({
  trackingNumber: z.string().trim().min(1, "El número de tracking es requerido"),
});

export type SetTrackingInput = z.infer<typeof setTrackingSchema>;

export const confirmPaymentSchema = z.object({
  paymentStatus: z.enum(["paid", "failed"]),
  note: z.string().trim().optional().default(""),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

export const setReceiptSchema = z.object({
  receiptUrl: z.string().trim().url("URL de comprobante inválida"),
});

export type SetReceiptInput = z.infer<typeof setReceiptSchema>;
