import { formatARS, type Order } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { uploadReceiptImage } from "@/lib/uploadReceipt";
import { NotFound } from "./NotFound";

const PAYMENT_QUERY_MESSAGES: Record<string, string> = {
  exitoso: "¡Gracias! Estamos confirmando tu pago con Mercado Pago.",
  fallido: "El pago no se pudo procesar. Podés reintentarlo contactándonos.",
  pendiente: "Tu pago está pendiente de confirmación.",
};

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [receiptSent, setReceiptSent] = useState(false);

  useEffect(() => {
    if (!id || !accessToken) return;
    apiFetch<{ order: Order }>(`/orders/${id}`, { accessToken })
      .then((res) => setOrder(res.order))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  async function handleReceiptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !order || !accessToken) return;

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadReceiptImage(file, accessToken);
      await apiFetch(`/orders/${order._id}/receipt`, {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ receiptUrl: url }),
      });
      setReceiptSent(true);
    } catch {
      setUploadError("No pudimos subir el comprobante. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  if (notFound || !order) {
    return <NotFound />;
  }

  const paymentMessage = searchParams.get("pago") ? PAYMENT_QUERY_MESSAGES[searchParams.get("pago")!] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="font-mono text-sm text-muted-foreground">{order.orderNumber}</p>
      <h1 className="mt-1 font-display text-3xl font-bold">¡Gracias por tu pedido!</h1>

      {paymentMessage && (
        <p className="mt-3 rounded-md border border-border bg-card px-4 py-3 text-sm">{paymentMessage}</p>
      )}

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Estado</span>
          <span className="font-semibold">{STATUS_LABELS[order.status]}</span>
        </div>

        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
          {order.items.map((item) => (
            <li key={item.variant.sku} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {item.quantity}x {item.variant.name}
              </span>
              <span className="font-mono">{formatARS(item.subtotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-bold">
          <span>Total</span>
          <span className="font-mono">{formatARS(order.total)}</span>
        </div>
      </div>

      {order.paymentMethod === "transfer" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Datos para transferir</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            CBU/Alias: <span className="font-mono">completar con los datos bancarios de Growshop</span>
            <br />
            Titular: <span className="font-mono">completar</span>
          </p>

          {order.paymentStatus === "paid" ? (
            <p className="mt-3 text-sm font-semibold text-success">Pago confirmado.</p>
          ) : receiptSent ? (
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
      )}

      <Button asChild size="lg" className="mt-6">
        <Link to="/">Seguir comprando</Link>
      </Button>
    </div>
  );
}
