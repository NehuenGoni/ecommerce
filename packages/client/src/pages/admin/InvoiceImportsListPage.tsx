import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvoiceImportStatusBadge } from "@/components/admin/InvoiceImportStatusBadge";
import { InvoiceUploadCard } from "@/components/admin/InvoiceUploadCard";
import { Pagination } from "@/components/catalog/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { listImports, type Paginated } from "@/lib/invoiceImports";
import type { SupplierInvoiceImport } from "@growshop/shared";

export function InvoiceImportsListPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<SupplierInvoiceImport> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);

    listImports(accessToken, { page })
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
      <h1 className="font-display text-3xl font-bold">Importar factura de proveedor</h1>

      <div className="mt-4">
        <InvoiceUploadCard onUploaded={(imp) => navigate(`/admin/compras/importaciones/${imp._id}`)} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Importaciones recientes</h2>

      {loading || !data ? (
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Todavía no importaste ninguna factura.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Fecha</th>
                <th className="px-4 py-2.5 font-semibold">Proveedor</th>
                <th className="px-4 py-2.5 font-semibold">Líneas</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((imp) => (
                <tr
                  key={imp._id}
                  onClick={() => navigate(`/admin/compras/importaciones/${imp._id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {new Date(imp.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{imp.supplier || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{imp.lines.length || "—"}</td>
                  <td className="px-4 py-2.5">
                    <InvoiceImportStatusBadge status={imp.status} />
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
