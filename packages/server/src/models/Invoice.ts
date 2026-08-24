import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export type InvoiceType = "C";
export type TaxCondition = "monotributo" | "responsable_inscripto" | "consumidor_final";
export type InvoiceStatus = "draft" | "issued" | "cancelled";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoiceDocument {
  order: Types.ObjectId;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  pointOfSale: number;
  cuit: string;
  taxCondition: TaxCondition;
  customerTaxId?: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  status: InvoiceStatus;
  issuedAt?: Date;
  /** TODO: integración AFIP para obtener CAE real */
  caeNumber?: string;
  caeExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<InvoiceItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceType: { type: String, enum: ["C"], default: "C" },
    pointOfSale: { type: Number, required: true },
    cuit: { type: String, required: true },
    taxCondition: {
      type: String,
      enum: ["monotributo", "responsable_inscripto", "consumidor_final"],
      required: true,
    },
    customerTaxId: { type: String },
    items: { type: [invoiceItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["draft", "issued", "cancelled"], default: "draft" },
    issuedAt: { type: Date },
    caeNumber: { type: String },
    caeExpiry: { type: Date },
  },
  { timestamps: true },
);

export type InvoiceHydratedDocument = HydratedDocument<InvoiceDocument>;

export const Invoice = mongoose.model<InvoiceDocument>("Invoice", invoiceSchema);
