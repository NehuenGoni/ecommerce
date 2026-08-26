import { formatARS } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pagination } from "@/components/catalog/Pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError, apiFetch } from "@/lib/api";
import { cheapestVariant } from "@/lib/catalog";
import type { ProductListItem } from "@/types/catalog";

interface ProductsResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  pages: number;
}

export function ProductsListPage() {
  const { accessToken } = useAuth();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (debouncedQ) params.set("q", debouncedQ);

    apiFetch<ProductsResponse>(`/products?${params.toString()}`, { accessToken })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, debouncedQ, page]);

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE", accessToken });
      setData((prev) => prev && { ...prev, items: prev.items.filter((p) => p._id !== id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos eliminar el producto.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Productos</h1>
        <Button asChild size="sm">
          <Link to="/admin/productos/nuevo">Nuevo producto</Link>
        </Button>
      </div>

      <input
        placeholder="Buscar por nombre..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        className="mt-4 w-full max-w-sm rounded-md border border-border bg-card px-3 py-2 text-sm"
      />

      {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}

      {loading || !data ? (
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No encontramos productos.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Producto</th>
                <th className="px-4 py-2.5 font-semibold">Categoría</th>
                <th className="px-4 py-2.5 font-semibold">Desde</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <tr key={product._id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{product.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{product.category.name}</td>
                  <td className="px-4 py-2.5 font-mono">{formatARS(cheapestVariant(product.variants).price)}</td>
                  <td className="px-4 py-2.5">
                    {product.isActive ? (
                      <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        to={`/admin/productos/${product._id}/editar`}
                        className="font-semibold text-primary hover:underline"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(product._id)}
                        className="font-semibold text-muted-foreground hover:text-destructive"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
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
