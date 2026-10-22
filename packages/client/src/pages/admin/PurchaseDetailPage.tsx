import { formatARS, type SupplierPurchase } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch } from "@/lib/api";

interface DetailItem extends Omit<SupplierPurchase["items"][number], "product"> {
  product: { _id: string; name: string; slug: string; variants?: { sku: string; name: string }[] } | null;
}

interface PurchaseDetail extends Omit<SupplierPurchase, "items" | "createdBy"> {
  items: DetailItem[];
  createdBy: { firstName: string; lastName: string; email: string } | null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<{ purchase: PurchaseDetail }>(`/supplier-purchases/${id}`, { accessToken })
      .then((res) => {
        if (!cancelled) setPurchase(res.purchase);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos cargar la compra.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !purchase) {
    return <p className="text-sm font-semibold text-destructive">{error ?? "No pudimos cargar la compra."}</p>;
  }

  const total = purchase.items.reduce((sum, item) => sum + item.totalCost, 0);
  const units = purchase.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <Link to="/admin/compras" className="text-sm text-muted-foreground hover:text-primary">
        ← Volver a compras
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{purchase.supplier}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDate(purchase.purchaseDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-muted-foreground">Total</p>
          <p className="font-mono text-2xl font-bold">{formatARS(total)}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-3">
          <dt className="text-xs uppercase text-muted-foreground">Líneas</dt>
          <dd className="mt-1 font-mono text-lg">{purchase.items.length}</dd>
        </div>
        <div className="rounded-xl border border-border p-3">
          <dt className="text-xs uppercase text-muted-foreground">Unidades</dt>
          <dd className="mt-1 font-mono text-lg">{units}</dd>
        </div>
        <div className="rounded-xl border border-border p-3">
          <dt className="text-xs uppercase text-muted-foreground">Registrada por</dt>
          <dd className="mt-1 truncate text-sm font-medium">
            {purchase.createdBy ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}` : "—"}
          </dd>
        </div>
        <div className="rounded-xl border border-border p-3">
          <dt className="text-xs uppercase text-muted-foreground">Cargada el</dt>
          <dd className="mt-1 text-sm font-medium">{formatDate(purchase.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Producto</th>
              <th className="px-4 py-2.5 font-semibold">SKU</th>
              <th className="px-4 py-2.5 text-right font-semibold">Cant.</th>
              <th className="px-4 py-2.5 text-right font-semibold">Costo unit.</th>
              <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item, index) => {
              const variantName = item.product?.variants?.find((v) => v.sku === item.variant)?.name;
              return (
                <tr key={`${item.variant}-${index}`} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    {item.product ? (
                      <Link
                        to={`/admin/productos/${item.product._id}/editar`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Producto eliminado</span>
                    )}
                    {variantName && <span className="block text-xs text-muted-foreground">{variantName}</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.variant}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatARS(item.unitCost)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatARS(item.totalCost)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-border bg-muted/30">
            <tr>
              <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-muted-foreground">
                Total
              </td>
              <td className="px-4 py-2.5 text-right font-mono font-bold">{formatARS(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {purchase.notes && (
        <div className="mt-6 rounded-xl border border-border p-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground">Notas</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{purchase.notes}</p>
        </div>
      )}
    </div>
  );
}
