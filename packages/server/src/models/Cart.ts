import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export interface CartItem {
  product: Types.ObjectId;
  variantSku: string;
  quantity: number;
}

export interface CartDocument {
  user: Types.ObjectId;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new Schema<CartDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export type CartHydratedDocument = HydratedDocument<CartDocument>;

export const Cart = mongoose.model<CartDocument>("Cart", cartSchema);
