import type { Order } from "@growshop/shared";
import { type ChangeEvent, useState } from "react";
import { apiFetch } from "@/lib/api";
import { uploadReceiptImage } from "@/lib/uploadReceipt";

interface TransferReceiptCardProps {
  order: Order;
  accessToken: string;
  onReceiptSent: () => void;
}

export function TransferReceiptCard({ order, accessToken, onReceiptSent }: TransferReceiptCardProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasReceipt = Boolean(order.paymentDetails.receiptUrl);

  async function handleReceiptUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadReceiptImage(file, accessToken);
      await apiFetch(`/orders/${order._id}/receipt`, {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ receiptUrl: url }),
      });
      onReceiptSent();
    } catch {
      setUploadError("No pudimos subir el comprobante. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">Datos para transferir</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        CBU/Alias: <span className="font-mono">completar con los datos bancarios de Growshop</span>
        <br />
        Titular: <span className="font-mono">completar</span>
      </p>

      {order.paymentStatus === "paid" ? (
        <p className="mt-3 text-sm font-semibold text-success">Pago confirmado.</p>
      ) : hasReceipt ? (
        <p className="mt-3 text-sm font-semibold text-success">
          Comprobante recibido. Vamos a confirmar tu pago a la brevedad.
        </p>
      ) : (
        <div className="mt-3">
          <label className="text-sm font-semibold" htmlFor="receipt">
            Subí tu comprobante
          </label>
          <input
            id="receipt"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => void handleReceiptUpload(e)}
            disabled={uploading}
            className="mt-1.5 block text-sm"
          />
          {uploading && <p className="mt-1 text-xs text-muted-foreground">Subiendo...</p>}
          {uploadError && <p className="mt-1 text-xs font-semibold text-destructive">{uploadError}</p>}
        </div>
      )}
    </div>
  );
}
