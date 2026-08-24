import type { Address, ID, Timestamps } from "./common.js";
import type { ProductVariant } from "./product.js";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "mercadopago" | "transfer" | "cash";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ShippingMethod = "mercadoenvios" | "moto" | "pickup";

export interface OrderItem {
  product: ID;
  /** Snapshot de la variante al momento de la compra */
  variant: ProductVariant;
  quantity: number;
  /** Precio unitario en centavos, al momento de la compra */
  unitPrice: number;
  /** unitPrice * quantity, en centavos */
  subtotal: number;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note: string;
  updatedBy: ID;
}

export interface Order extends Timestamps {
  _id: ID;
  orderNumber: string;
  customer: ID;
  items: OrderItem[];
  /** Montos en centavos */
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryEntry[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDetails: Record<string, unknown>;
  shippingMethod: ShippingMethod;
  shippingAddress: Address;
  trackingNumber?: string;
  notes: string;
  customerNotes: string;
}
