import type { ID, Timestamps } from "./common.js";

export type SupplierInvoiceImportStatus =
  | "uploaded"
  | "extracting"
  | "review"
  | "applying"
  | "applied"
  | "failed"
  | "discarded";

export type SupplierInvoiceDocumentType = "factura" | "remito" | "presupuesto" | "desconocido";
export type SupplierInvoiceCurrency = "ARS" | "USD";
export type LineMatchStatus = "matched" | "unmatched";
export type LineMatchMethod = "sku" | "barcode" | "manual" | "none";
export type LineAction = "link" | "skip";

export interface SupplierInvoiceImportFile {
  url: string;
  publicId: string;
  resourceType: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  sha256: string;
}

export interface SupplierInvoiceImportTotals {
  subtotal: number | null;
  tax: number | null;
  total: number | null;
}

export interface SupplierInvoiceImportLineRaw {
  description: string;
  supplierSku: string;
  barcode: string;
  quantity: number;
  unit: string;
  unitCost: number | null;
  taxPercent: number;
  unitCostIncludesTax: boolean;
  discountPercent: number;
  modelConfidence: number;
  modelNotes: string;
}

export interface SupplierInvoiceImportLineMatch {
  status: LineMatchStatus;
  method: LineMatchMethod;
  product: ID | null;
  variantSku: string;
  currentCostPrice: number | null;
  currentPrice: number | null;
}

export interface SupplierInvoiceImportLineDecision {
  action: LineAction;
  product: ID | null;
  variantSku: string;
  quantity: number;
  unitCost: number;
  updateCostPrice: boolean;
  updateSalePrice: boolean;
  marginPercent: number | null;
  salePrice: number | null;
}

export interface SupplierInvoiceImportLineResult {
  ok: boolean;
  error: string;
}

export interface SupplierInvoiceImportLine {
  lineNumber: number;
  raw: SupplierInvoiceImportLineRaw;
  match: SupplierInvoiceImportLineMatch;
  decision: SupplierInvoiceImportLineDecision;
  result: SupplierInvoiceImportLineResult;
}

export interface SupplierInvoiceImportExtraction {
  model: string;
  promptVersion: string;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  lastError: string;
}

export interface SupplierInvoiceImport extends Timestamps {
  _id: ID;
  status: SupplierInvoiceImportStatus;
  file: SupplierInvoiceImportFile;
  supplier: string;
  supplierTaxId: string;
  documentType: SupplierInvoiceDocumentType;
  documentNumber: string;
  documentDate: string | null;
  currency: SupplierInvoiceCurrency;
  totals: SupplierInvoiceImportTotals;
  lines: SupplierInvoiceImportLine[];
  extraction: SupplierInvoiceImportExtraction;
  notes: string;
  purchase: ID | null;
  appliedAt: string | null;
  createdBy: ID;
}
