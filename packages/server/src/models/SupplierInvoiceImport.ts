import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

/**
 * Importación de una factura/remito de proveedor leída por IA.
 *
 * Nombre elegido para no chocar con `Invoice` (factura de VENTA al cliente,
 * AFIP/CAE). Este modelo es un documento de staging: la IA nunca escribe en
 * el catálogo, solo llena `lines` con un borrador que un admin revisa y
 * corrige en `decision` antes de confirmar. Al aplicar, se crea una
 * `SupplierPurchase` real (que ya sabe mover stock) y se actualizan precios.
 *
 * Máquina de estados:
 *   uploaded → extracting → review → applying → applied
 *                  ↓            ↓         ↓
 *                failed      discarded  failed (vuelve a "review")
 *
 * v1 solo soporta matching exacto (SKU/barcode) y vinculación manual a un
 * producto existente -- crear productos nuevos desde una línea sin match
 * queda para v2, por eso `LineMatchMethod`/`LineAction` no incluyen todavía
 * "text"/"create".
 */
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
  /** Hash del contenido, usado para detectar que la misma factura ya fue cargada. */
  sha256: string;
}

export interface SupplierInvoiceImportTotals {
  /** Todos los importes en centavos ARS, o null si el documento no los informa. */
  subtotal: number | null;
  tax: number | null;
  total: number | null;
}

export interface SupplierInvoiceImportLineRaw {
  description: string;
  supplierSku: string;
  barcode: string;
  quantity: number;
  /** Unidad tal como figura en el documento (ej. "u.", "bulto x12", "caja"). */
  unit: string;
  /** Costo unitario NETO (sin IVA) en centavos, ya convertido por el server. Null en remitos sin precios. */
  unitCost: number | null;
  taxPercent: number;
  /** Si el precio que informó el documento incluía IVA (antes de la conversión a neto). */
  unitCostIncludesTax: boolean;
  discountPercent: number;
  /** Confianza 0..1 que reportó el propio modelo para esta línea. */
  modelConfidence: number;
  modelNotes: string;
}

export interface SupplierInvoiceImportLineMatch {
  status: LineMatchStatus;
  method: LineMatchMethod;
  product: Types.ObjectId | null;
  variantSku: string;
  /** Precios actuales de la variante matcheada, en centavos, para mostrar el delta sin queries extra. */
  currentCostPrice: number | null;
  currentPrice: number | null;
}

export interface SupplierInvoiceImportLineDecision {
  action: LineAction;
  product: Types.ObjectId | null;
  variantSku: string;
  quantity: number;
  /** Costo unitario neto en centavos, editable por el admin (prellenado desde raw.unitCost). */
  unitCost: number;
  updateCostPrice: boolean;
  updateSalePrice: boolean;
  /** Override de margen para esta línea; null = usar DEFAULT_MARGIN_PCT. */
  marginPercent: number | null;
  /** Precio de venta calculado/editado, en centavos; null hasta que se calcule. */
  salePrice: number | null;
}

export interface SupplierInvoiceImportLineResult {
  ok: boolean;
  error: string;
}

export interface SupplierInvoiceImportLine {
  /** 1..n, clave estable para el PATCH de una línea desde el cliente (no usar el índice del array). */
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
  startedAt: Date | null;
  completedAt: Date | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  lastError: string;
}

export interface SupplierInvoiceImportDocument {
  status: SupplierInvoiceImportStatus;
  file: SupplierInvoiceImportFile;
  supplier: string;
  supplierTaxId: string;
  documentType: SupplierInvoiceDocumentType;
  documentNumber: string;
  documentDate: Date | null;
  currency: SupplierInvoiceCurrency;
  totals: SupplierInvoiceImportTotals;
  lines: SupplierInvoiceImportLine[];
  extraction: SupplierInvoiceImportExtraction;
  notes: string;
  /** Se llena recién al aplicar la importación. */
  purchase: Types.ObjectId | null;
  appliedAt: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<SupplierInvoiceImportFile>(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    resourceType: { type: String, default: "" },
    mimeType: { type: String, required: true },
    originalName: { type: String, default: "" },
    sizeBytes: { type: Number, required: true, min: 0 },
    sha256: { type: String, required: true },
  },
  { _id: false },
);

const totalsSchema = new Schema<SupplierInvoiceImportTotals>(
  {
    subtotal: { type: Number, default: null },
    tax: { type: Number, default: null },
    total: { type: Number, default: null },
  },
  { _id: false },
);

const lineRawSchema = new Schema<SupplierInvoiceImportLineRaw>(
  {
    description: { type: String, required: true, trim: true },
    supplierSku: { type: String, default: "" },
    barcode: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "" },
    unitCost: { type: Number, default: null },
    taxPercent: { type: Number, default: 0 },
    unitCostIncludesTax: { type: Boolean, default: false },
    discountPercent: { type: Number, default: 0 },
    modelConfidence: { type: Number, default: 0, min: 0, max: 1 },
    modelNotes: { type: String, default: "" },
  },
  { _id: false },
);

const lineMatchSchema = new Schema<SupplierInvoiceImportLineMatch>(
  {
    status: { type: String, enum: ["matched", "unmatched"], required: true },
    method: { type: String, enum: ["sku", "barcode", "manual", "none"], required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    variantSku: { type: String, default: "" },
    currentCostPrice: { type: Number, default: null },
    currentPrice: { type: Number, default: null },
  },
  { _id: false },
);

const lineDecisionSchema = new Schema<SupplierInvoiceImportLineDecision>(
  {
    action: { type: String, enum: ["link", "skip"], required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    variantSku: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0, default: 0 },
    updateCostPrice: { type: Boolean, default: true },
    updateSalePrice: { type: Boolean, default: true },
    marginPercent: { type: Number, default: null },
    salePrice: { type: Number, default: null },
  },
  { _id: false },
);

const lineResultSchema = new Schema<SupplierInvoiceImportLineResult>(
  {
    ok: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  { _id: false },
);

const supplierInvoiceImportLineSchema = new Schema<SupplierInvoiceImportLine>(
  {
    lineNumber: { type: Number, required: true, min: 1 },
    raw: { type: lineRawSchema, required: true },
    match: { type: lineMatchSchema, required: true },
    decision: { type: lineDecisionSchema, required: true },
    result: { type: lineResultSchema, default: () => ({}) },
  },
  { _id: false },
);

const extractionSchema = new Schema<SupplierInvoiceImportExtraction>(
  {
    model: { type: String, default: "" },
    promptVersion: { type: String, default: "" },
    attempts: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    inputTokens: { type: Number, default: 0, min: 0 },
    outputTokens: { type: Number, default: 0, min: 0 },
    cacheReadTokens: { type: Number, default: 0, min: 0 },
    lastError: { type: String, default: "" },
  },
  { _id: false },
);

const supplierInvoiceImportSchema = new Schema<SupplierInvoiceImportDocument>(
  {
    status: {
      type: String,
      enum: ["uploaded", "extracting", "review", "applying", "applied", "failed", "discarded"],
      default: "uploaded",
    },
    file: { type: fileSchema, required: true },
    supplier: { type: String, default: "", trim: true },
    supplierTaxId: { type: String, default: "" },
    documentType: {
      type: String,
      enum: ["factura", "remito", "presupuesto", "desconocido"],
      default: "desconocido",
    },
    documentNumber: { type: String, default: "" },
    documentDate: { type: Date, default: null },
    currency: { type: String, enum: ["ARS", "USD"], default: "ARS" },
    totals: { type: totalsSchema, default: () => ({}) },
    lines: { type: [supplierInvoiceImportLineSchema], default: [] },
    extraction: { type: extractionSchema, default: () => ({}) },
    notes: { type: String, default: "" },
    purchase: { type: Schema.Types.ObjectId, ref: "SupplierPurchase", default: null },
    appliedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

supplierInvoiceImportSchema.index({ status: 1, createdAt: -1 });
// No unique: una importación descartada debe poder resubirse con el mismo archivo.
supplierInvoiceImportSchema.index({ "file.sha256": 1 });
supplierInvoiceImportSchema.index({ purchase: 1 }, { sparse: true });

export type SupplierInvoiceImportHydratedDocument = HydratedDocument<SupplierInvoiceImportDocument>;

export const SupplierInvoiceImport = mongoose.model<SupplierInvoiceImportDocument>(
  "SupplierInvoiceImport",
  supplierInvoiceImportSchema,
);
