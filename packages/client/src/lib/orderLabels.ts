import type { Order } from "@growshop/shared";

export const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_METHOD_LABELS: Record<Order["paymentMethod"], string> = {
  mercadopago: "Mercado Pago",
  transfer: "Transferencia bancaria",
  cash: "Efectivo",
};
