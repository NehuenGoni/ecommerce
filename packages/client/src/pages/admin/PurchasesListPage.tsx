import { formatARS, type SupplierPurchase } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pagination } from "@/components/catalog/Pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface AdminPurchase extends Omit<SupplierPurchase, "items"> {
  items: (SupplierPurchase["items"][number] & { product: { _id: string; name: string; slug: string } | null })[];
}

interface Paginated<T> {
  items: T[];
  page: number;
  pages: number;
}

function totalOf(purchase: AdminPurchase): number {
  return purchase.items.reduce((sum, item) => sum + item.totalCost, 0);
}

export function PurchasesListPage() {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminPurchase> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);

    apiFetch<Paginated<AdminPurchase>>(`/supplier-purchases?page=${page}&limit=20`, { accessToken })
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Compras a proveedores</h1>
        <Button asChild size="sm">
          <Link to="/admin/compras/nueva">Registrar compra</Link>
        </Button>
      </div>

      {loading || !data ? (
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Todavía no registraste compras.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Fecha</th>
                <th className="px-4 py-2.5 font-semibold">Proveedor</th>
                <th className="px-4 py-2.5 font-semibold">Ítems</th>
                <th className="px-4 py-2.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((purchase) => (
                <tr key={purchase._id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {new Date(purchase.purchaseDate).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{purchase.supplier}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {purchase.items.map((item) => item.product?.name ?? item.variant).join(", ")}
                  </td>
                  <td className="px-4 py-2.5 font-mono">{formatARS(totalOf(purchase))}</td>
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
