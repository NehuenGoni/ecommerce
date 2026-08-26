import { formatARS, type Order } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface Paginated<T> {
  items: T[];
  total: number;
}

interface DashboardStats {
  pendingOrders: number;
  lowStockCount: number;
  productCount: number;
  recentOrders: Order[];
}

export function DashboardPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    Promise.all([
      apiFetch<Paginated<Order>>("/orders?status=pending&limit=1", { accessToken }),
      apiFetch<Paginated<unknown>>("/inventory/stock?lowStockOnly=true&limit=1", { accessToken }),
      apiFetch<Paginated<unknown>>("/products?limit=1", { accessToken }),
      apiFetch<Paginated<Order>>("/orders?limit=5", { accessToken }),
    ]).then(([pending, lowStock, products, recent]) => {
      if (cancelled) return;
      setStats({
        pendingOrders: pending.total,
        lowStockCount: lowStock.total,
        productCount: products.total,
        recentOrders: recent.items,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>

      {!stats ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Pedidos pendientes" value={stats.pendingOrders} to="/admin/pedidos?status=pending" />
          <StatCard
            label="Stock bajo"
            value={stats.lowStockCount}
            to="/admin/inventario"
            tone="warning"
          />
          <StatCard label="Productos" value={stats.productCount} to="/admin/productos" />
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Pedidos recientes</h2>
          <Link to="/admin/pedidos" className="text-sm font-semibold text-primary hover:underline">
            Ver todos
          </Link>
        </div>

        {!stats ? (
          <Skeleton className="mt-3 h-48 w-full" />
        ) : stats.recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Todavía no hay pedidos.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[540px] text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Pedido</th>
                  <th className="px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5 font-semibold">Total</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order._id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-mono">{order.orderNumber}</td>
                    <td className="px-4 py-2.5">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-2.5 font-mono">{formatARS(order.total)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        to={`/admin/pedidos/${order._id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
