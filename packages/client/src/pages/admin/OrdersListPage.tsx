import { formatARS, type Order } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Pagination } from "@/components/catalog/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ORDER_STATUS_LABELS } from "@/lib/orderLabels";
import type { AdminOrder } from "@/types/adminOrder";

interface OrdersResponse {
  items: AdminOrder[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_OPTIONS: Array<Order["status"] | ""> = [
  "",
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

export function OrdersListPage() {
  const { accessToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);

    apiFetch<OrdersResponse>(`/orders?${params.toString()}`, { accessToken })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, status, page]);

  function handleStatusChange(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("status", value);
    else next.delete("status");
    next.delete("page");
    setSearchParams(next);
  }

  function handlePageChange(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Pedidos</h1>

      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="mt-4 rounded-md border border-border bg-card px-3 py-2 text-sm"
      >
        {STATUS_OPTIONS.map((value) => (
          <option key={value || "all"} value={value}>
            {value ? ORDER_STATUS_LABELS[value] : "Todos los estados"}
          </option>
        ))}
      </select>

      {loading || !data ? (
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No hay pedidos con ese filtro.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Pedido</th>
                <th className="px-4 py-2.5 font-semibold">Cliente</th>
                <th className="px-4 py-2.5 font-semibold">Total</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((order) => (
                <tr key={order._id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono">{order.orderNumber}</td>
                  <td className="px-4 py-2.5">
                    {order.customer.firstName} {order.customer.lastName}
                  </td>
                  <td className="px-4 py-2.5 font-mono">{formatARS(order.total)}</td>
                  <td className="px-4 py-2.5">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/admin/pedidos/${order._id}`} className="font-semibold text-primary hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && <Pagination page={data.page} pages={data.pages} onPageChange={handlePageChange} />}
    </div>
  );
}
