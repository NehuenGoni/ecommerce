import type { SupplierInvoiceImport } from "@growshop/shared";
import { type ChangeEvent, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { uploadInvoice } from "@/lib/invoiceImports";

interface InvoiceUploadCardProps {
  onUploaded: (imp: SupplierInvoiceImport) => void;
}

export function InvoiceUploadCard({ onUploaded }: InvoiceUploadCardProps) {
  const { accessToken } = useAuth();
  const [supplier, setSupplier] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;

    setUploading(true);
    setError(null);
    try {
      const imp = await uploadInvoice(file, accessToken, supplier.trim() || undefined);
      onUploaded(imp);
      setSupplier("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No pudimos subir la factura. Probá de nuevo.",
      );
    } finally {
      setUploading(false);
      event.target.value = ""; // permite volver a elegir el mismo archivo si hace falta reintentar
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-semibold">Importar factura de proveedor</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Subí el PDF o una foto de la factura o remito. Un agente de IA lee las líneas y las deja
        listas para que las revises antes de confirmar la compra.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <input
          placeholder="Proveedor (opcional -- si no lo cargás, lo completa la extracción)"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          disabled={uploading}
          className="min-w-[16rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <label className="text-sm font-semibold">
          <span className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
            {uploading ? "Subiendo..." : "Elegir archivo"}
          </span>
          <input
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleFileChange(e)}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}
