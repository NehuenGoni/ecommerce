import { formatARS } from "@growshop/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Pagination } from "@/components/catalog/Pagination";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOrders } from "@/hooks/useMyOrders";

export function OrdersListPage() {
  const [page, setPage] = useState(1);
  const { data, loading } = useMyOrders(page);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <p className="text-muted-foreground">Todavía no hiciste ningún pedido.</p>;
  }

  return (
    <div>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {data.items.map((order) => (
          <li key={order._id}>
            <Link
              to={`/cuenta/pedidos/${order._id}`}
              className="flex items-center justify-between gap-4 py-4 hover:bg-muted/50"
            >
              <div>
                <p className="font-mono text-sm font-semibold">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("es-AR")}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
              <span className="font-mono text-sm font-semibold">{formatARS(order.total)}</span>
            </Link>
          </li>
        ))}
      </ul>

      {data.pages > 1 && <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />}
    </div>
  );
}
