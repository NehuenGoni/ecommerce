import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export type StockMovementType = "purchase_in" | "sale_out" | "adjustment" | "return";

export interface StockMovementDocument {
  product: Types.ObjectId;
  variantSku: string;
  type: StockMovementType;
  /** Positivo = entrada, negativo = salida */
  quantity: number;
  previousStock: number;
  newStock: number;
  /** ID de orden o compra relacionada */
  reference: string;
  note: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const stockMovementSchema = new Schema<StockMovementDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String, required: true },
    type: {
      type: String,
      enum: ["purchase_in", "sale_out", "adjustment", "return"],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reference: { type: String, default: "" },
    note: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type StockMovementHydratedDocument = HydratedDocument<StockMovementDocument>;

export const StockMovement = mongoose.model<StockMovementDocument>(
  "StockMovement",
  stockMovementSchema,
);
