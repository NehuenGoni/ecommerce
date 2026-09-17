import type { SupplierInvoiceImport, SupplierPurchase } from "@growshop/shared";
import { apiFetch } from "@/lib/api";

export interface Paginated<T> {
  items: T[];
  page: number;
  pages: number;
}

export interface ImportListQuery {
  status?: string;
  supplier?: string;
  page: number;
}

export interface ImportDetail {
  import: SupplierInvoiceImport;
  fileUrl: string;
  pricingDefaults: { marginPercent: number; roundingStep: number };
}

/** Lo mismo que acepta PATCH /:id/lines/:lineNumber -- ver supplierInvoiceImport.validators.ts en el server. */
export type LineDecisionInput =
  | { action: "skip" }
  | {
      action: "link";
      product: string;
      variantSku: string;
      quantity: number;
      unitCost: number;
      updateCostPrice: boolean;
      updateSalePrice: boolean;
      marginPercent: number | null;
      salePrice: number | null;
    };

export interface UpdateImportHeaderInput {
  supplier?: string;
  documentNumber?: string;
  documentDate?: string;
  notes?: string;
}

export interface ApplyImportInput {
  purchaseDate?: string;
  notes?: string;
}

export function listImports(accessToken: string, query: ImportListQuery): Promise<Paginated<SupplierInvoiceImport>> {
  const params = new URLSearchParams({ page: String(query.page), limit: "20" });
  if (query.status) params.set("status", query.status);
  if (query.supplier) params.set("supplier", query.supplier);
  return apiFetch<Paginated<SupplierInvoiceImport>>(`/supplier-invoices?${params.toString()}`, { accessToken });
}

/** Sube el PDF/foto de la factura. El resto de los campos los completa la extracción por IA. */
export async function uploadInvoice(
  file: File,
  accessToken: string,
  supplier?: string,
): Promise<SupplierInvoiceImport> {
  const formData = new FormData();
  formData.append("file", file);
  if (supplier) formData.append("supplier", supplier);

  const res = await apiFetch<{ import: SupplierInvoiceImport }>("/supplier-invoices", {
    method: "POST",
    accessToken,
    body: formData,
  });
  return res.import;
}

export function getImport(id: string, accessToken: string): Promise<ImportDetail> {
  return apiFetch<ImportDetail>(`/supplier-invoices/${id}`, { accessToken });
}

export async function updateImportHeader(
  id: string,
  input: UpdateImportHeaderInput,
  accessToken: string,
): Promise<SupplierInvoiceImport> {
  const res = await apiFetch<{ import: SupplierInvoiceImport }>(`/supplier-invoices/${id}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
  return res.import;
}

export async function patchLine(
  importId: string,
  lineNumber: number,
  input: LineDecisionInput,
  accessToken: string,
): Promise<SupplierInvoiceImport> {
  const res = await apiFetch<{ import: SupplierInvoiceImport }>(
    `/supplier-invoices/${importId}/lines/${lineNumber}`,
    { method: "PATCH", accessToken, body: JSON.stringify(input) },
  );
  return res.import;
}

export function applyImport(
  id: string,
  input: ApplyImportInput,
  accessToken: string,
): Promise<{ import: SupplierInvoiceImport; purchase: SupplierPurchase }> {
  return apiFetch(`/supplier-invoices/${id}/apply`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export async function discardImport(id: string, accessToken: string): Promise<void> {
  await apiFetch<void>(`/supplier-invoices/${id}`, { method: "DELETE", accessToken });
}
