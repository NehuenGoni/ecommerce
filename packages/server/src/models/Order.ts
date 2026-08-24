import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";
import { nextSequence } from "./Counter.js";
import type { ProductVariant } from "./Product.js";
import type { Address } from "./User.js";

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
  product: Types.ObjectId;
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
  timestamp: Date;
  note: string;
  updatedBy: Types.ObjectId;
}

export interface OrderDocument {
  orderNumber: string;
  customer: Types.ObjectId;
  items: OrderItem[];
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
  createdAt: Date;
  updatedAt: Date;
}

const variantSnapshotSchema = new Schema<ProductVariant>(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    stock: { type: Number, required: true },
    lowStockThreshold: { type: Number, required: true },
    weight: { type: Number, required: true },
    barcode: { type: String },
  },
  { _id: false },
);

const orderItemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variant: { type: variantSnapshotSchema, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderStatusHistorySchema = new Schema<OrderStatusHistoryEntry>(
  {
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const addressSchema = new Schema<Address>(
  {
    label: { type: String, default: "" },
    street: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    zipCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items: OrderItem[]) => items.length > 0,
        message: "La orden necesita al menos un item",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    statusHistory: { type: [orderStatusHistorySchema], default: [] },
    paymentMethod: { type: String, enum: ["mercadopago", "transfer", "cash"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: { type: Schema.Types.Mixed, default: {} },
    shippingMethod: { type: String, enum: ["mercadoenvios", "moto", "pickup"], required: true },
    shippingAddress: { type: addressSchema, required: true },
    trackingNumber: { type: String },
    notes: { type: String, default: "" },
    customerNotes: { type: String, default: "" },
  },
  { timestamps: true },
);

orderSchema.pre("validate", async function (next) {
  if (!this.orderNumber) {
    const seq = await nextSequence("orderNumber");
    this.orderNumber = `#GS-${String(seq).padStart(5, "0")}`;
  }
  next();
});

export type OrderHydratedDocument = HydratedDocument<OrderDocument>;

export const Order = mongoose.model<OrderDocument>("Order", orderSchema);
