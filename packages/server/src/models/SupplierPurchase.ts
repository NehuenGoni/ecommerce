import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export interface SupplierPurchaseItem {
  product: Types.ObjectId;
  /** SKU de la variante comprada */
  variant: string;
  quantity: number;
  /** Costo unitario en centavos */
  unitCost: number;
  /** unitCost * quantity, en centavos */
  totalCost: number;
}

export interface SupplierPurchaseDocument {
  supplier: string;
  items: SupplierPurchaseItem[];
  purchaseDate: Date;
  notes: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const supplierPurchaseItemSchema = new Schema<SupplierPurchaseItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variant: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const supplierPurchaseSchema = new Schema<SupplierPurchaseDocument>(
  {
    supplier: { type: String, required: true, trim: true },
    items: {
      type: [supplierPurchaseItemSchema],
      validate: {
        validator: (items: SupplierPurchaseItem[]) => items.length > 0,
        message: "La compra necesita al menos un item",
      },
    },
    purchaseDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export type SupplierPurchaseHydratedDocument = HydratedDocument<SupplierPurchaseDocument>;

export const SupplierPurchase = mongoose.model<SupplierPurchaseDocument>(
  "SupplierPurchase",
  supplierPurchaseSchema,
);
