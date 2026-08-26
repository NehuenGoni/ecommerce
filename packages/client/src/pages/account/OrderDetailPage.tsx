import type { Order } from "@growshop/shared";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { OrderItemsSummary } from "@/components/orders/OrderItemsSummary";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { TransferReceiptCard } from "@/components/orders/TransferReceiptCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { PAYMENT_METHOD_LABELS } from "@/lib/orderLabels";
import { NotFound } from "../NotFound";

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchOrder = useCallback(() => {
    if (!id || !accessToken) return;
    apiFetch<{ order: Order }>(`/orders/${id}`, { accessToken })
      .then((res) => setOrder(res.order))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (notFound || !order || !accessToken) {
    return <NotFound />;
  }

  return (
    <div>
      <Link to="/cuenta/pedidos" className="text-sm text-muted-foreground hover:text-primary">
        ← Volver a mis pedidos
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{order.orderNumber}</p>
          <h2 className="font-display text-2xl font-bold">Detalle del pedido</h2>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Pago: {PAYMENT_METHOD_LABELS[order.paymentMethod]}
        {order.trackingNumber && (
          <>
            {" · "}Tracking: <span className="font-mono">{order.trackingNumber}</span>
          </>
        )}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <OrderItemsSummary order={order} />
        {order.paymentMethod === "transfer" && (
          <TransferReceiptCard order={order} accessToken={accessToken} onReceiptSent={fetchOrder} />
        )}
        <OrderStatusTimeline history={order.statusHistory} />
      </div>
    </div>
  );
}
