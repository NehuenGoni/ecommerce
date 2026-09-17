import mongoose, { Schema, type HydratedDocument } from "mongoose";

export interface SupplierDocument {
  name: string;
  taxId: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<SupplierDocument>(
  {
    name: { type: String, required: true, trim: true },
    taxId: { type: String, default: "", trim: true },
    contactName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    address: { type: String, default: "" },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type SupplierHydratedDocument = HydratedDocument<SupplierDocument>;

export const Supplier = mongoose.model<SupplierDocument>("Supplier", supplierSchema);
