import { formatARS } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Pagination } from "@/components/catalog/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { apiFetch } from "@/lib/api";
import { MOVEMENT_TYPE_LABELS, type AdminStockMovement, type StockRow } from "@/types/adminInventory";

interface Paginated<T> {
  items: T[];
  page: number;
  pages: number;
}

function StockTab() {
  const { accessToken } = useAuth();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<StockRow> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (debouncedQ) params.set("q", debouncedQ);
    if (lowStockOnly) params.set("lowStockOnly", "true");

    apiFetch<Paginated<StockRow>>(`/inventory/stock?${params.toString()}`, { accessToken })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, debouncedQ, lowStockOnly, page]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Buscar por producto o SKU..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="min-w-[14rem] flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          Solo stock bajo
        </label>
      </div>

      {loading || !data ? (
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No hay variantes que coincidan.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Producto</th>
                <th className="px-4 py-2.5 font-semibold">SKU</th>
                <th className="px-4 py-2.5 font-semibold">Stock</th>
                <th className="px-4 py-2.5 font-semibold">Costo</th>
                <th className="px-4 py-2.5 font-semibold">Precio</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.sku} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {row.productName} <span className="text-muted-foreground">({row.variantName})</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.sku}</td>
                  <td className={cn("px-4 py-2.5 font-mono font-semibold", row.isLowStock && "text-warning")}>
                    {row.stock}
                    {row.isLowStock && (
                      <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                        Bajo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{formatARS(row.costPrice)}</td>
                  <td className="px-4 py-2.5 font-mono">{formatARS(row.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />}
    </div>
  );
}

function MovementsTab() {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminStockMovement> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);

    apiFetch<Paginated<AdminStockMovement>>(`/inventory/movements?page=${page}&limit=20`, { accessToken })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, page]);

  if (loading || !data) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (data.items.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">Todavía no hay movimientos de stock.</p>;
  }

  return (
    <div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Fecha</th>
              <th className="px-4 py-2.5 font-semibold">Producto</th>
              <th className="px-4 py-2.5 font-semibold">Tipo</th>
              <th className="px-4 py-2.5 font-semibold">Cantidad</th>
              <th className="px-4 py-2.5 font-semibold">Stock resultante</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m._id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-mono text-muted-foreground">
                  {new Date(m.createdAt).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-2.5">
                  {m.product?.name ?? "—"} <span className="text-muted-foreground">({m.variantSku})</span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{MOVEMENT_TYPE_LABELS[m.type]}</td>
                <td className={cn("px-4 py-2.5 font-mono font-semibold", m.quantity < 0 ? "text-destructive" : "text-success")}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </td>
                <td className="px-4 py-2.5 font-mono">{m.newStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.pages > 1 && <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />}
    </div>
  );
}

export function InventoryPage() {
  const [tab, setTab] = useState<"stock" | "movements">("stock");

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Inventario</h1>

      <div className="mt-4 flex gap-1 border-b border-border">
        {(
          [
            ["stock", "Stock"],
            ["movements", "Movimientos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors",
              tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">{tab === "stock" ? <StockTab /> : <MovementsTab />}</div>
    </div>
  );
}
