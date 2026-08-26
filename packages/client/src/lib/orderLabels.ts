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

/** Espeja el grafo de transiciones válidas del backend (order.service.ts), para no ofrecer en el admin un cambio de estado que el servidor va a rechazar. */
export const ORDER_STATUS_TRANSITIONS: Record<Order["status"], Order["status"][]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
