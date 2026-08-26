import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { OrderItemsSummary } from "@/components/orders/OrderItemsSummary";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch } from "@/lib/api";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS, PAYMENT_METHOD_LABELS } from "@/lib/orderLabels";
import { NotFound } from "@/pages/NotFound";
import type { AdminOrder } from "@/types/adminOrder";

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nextStatus, setNextStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const fetchOrder = useCallback(() => {
    if (!id || !accessToken) return;
    apiFetch<{ order: AdminOrder }>(`/orders/${id}`, { accessToken })
      .then((res) => {
        setOrder(res.order);
        setTrackingNumber(res.order.trackingNumber ?? "");
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handleStatusChange(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !order || !nextStatus) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/orders/${order._id}/status`, {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ status: nextStatus, note: statusNote }),
      });
      setNextStatus("");
      setStatusNote("");
      fetchOrder();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cambiar el estado.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTrackingSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !order || !trackingNumber.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/orders/${order._id}/tracking`, {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ trackingNumber }),
      });
      fetchOrder();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el tracking.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmPayment(paymentStatus: "paid" | "failed") {
    if (!accessToken || !order) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/orders/${order._id}/payment`, {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ paymentStatus, note: "" }),
      });
      fetchOrder();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos confirmar el pago.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-80 w-full" />;
  if (notFound || !order) return <NotFound />;

  const availableStatuses = ORDER_STATUS_TRANSITIONS[order.status];
  const receiptUrl = order.paymentDetails?.receiptUrl as string | undefined;

  return (
    <div>
      <Link to="/admin/pedidos" className="text-sm text-muted-foreground hover:text-primary">
        ← Volver a pedidos
      </Link>

      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{order.orderNumber}</p>
          <h1 className="font-display text-2xl font-bold">Detalle del pedido</h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <OrderItemsSummary order={order} />
          <OrderStatusTimeline history={order.statusHistory} />
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-base font-bold">Cliente</h2>
            <p className="mt-2 text-sm">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{order.customer.email}</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-base font-bold">Envío</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.province} (
              {order.shippingAddress.zipCode})
            </p>
            <form onSubmit={handleTrackingSubmit} className="mt-3 flex gap-2">
              <input
                placeholder="Número de tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm" variant="outline" disabled={busy}>
                Guardar
              </Button>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-base font-bold">Pago</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {PAYMENT_METHOD_LABELS[order.paymentMethod]} · {order.paymentStatus}
            </p>
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Ver comprobante
              </a>
            )}
            {order.paymentMethod === "transfer" && order.paymentStatus === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={busy || !receiptUrl} onClick={() => void handleConfirmPayment("paid")}>
                  Confirmar pago
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleConfirmPayment("failed")}
                >
                  Rechazar
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-base font-bold">Cambiar estado</h2>
            {availableStatuses.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Este pedido no admite más cambios de estado.</p>
            ) : (
              <form onSubmit={handleStatusChange} className="mt-3 flex flex-col gap-2">
                <select
                  required
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Elegir estado
                  </option>
                  {availableStatuses.map((s) => (
                    <option key={s} value={s}>
                      {ORDER_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Nota (opcional)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <Button type="submit" size="sm" disabled={busy || !nextStatus}>
                  Aplicar cambio
                </Button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
