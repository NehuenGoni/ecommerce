import type { ID, Timestamps } from "./common.js";

export type InvoiceType = "C";
export type TaxCondition = "monotributo" | "responsable_inscripto" | "consumidor_final";
export type InvoiceStatus = "draft" | "issued" | "cancelled";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Invoice extends Timestamps {
  _id: ID;
  order: ID;
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
  issuedAt?: string;
  /** TODO: integración AFIP */
  caeNumber?: string;
  caeExpiry?: string;
}
