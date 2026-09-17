import { formatARS } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { InvoiceImportStatusBadge } from "@/components/admin/InvoiceImportStatusBadge";
import { InvoiceLineRow } from "@/components/admin/InvoiceLineRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoiceImport } from "@/hooks/useInvoiceImport";
import { ApiError, apiFetch } from "@/lib/api";
import { applyImport, patchLine, updateImportHeader, type LineDecisionInput } from "@/lib/invoiceImports";
import type { ProductListItem } from "@/types/catalog";

function FilePreview({ fileUrl, mimeType }: { fileUrl: string; mimeType: string }) {
  if (!fileUrl) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Vista previa no disponible (Cloudinary no está configurado en este ambiente)
      </div>
    );
  }
  if (mimeType === "application/pdf") {
    return <iframe src={fileUrl} title="Factura" className="h-[32rem] w-full rounded-xl border border-border" />;
  }
  return <img src={fileUrl} alt="Factura" className="w-full rounded-xl border border-border object-contain" />;
}

export function InvoiceImportReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { data, loading, error, refresh } = useInvoiceImport(id);

  const [products, setProducts] = useState<ProductListItem[] | null>(null);
  const [supplierInput, setSupplierInput] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [applyNotes, setApplyNotes] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ items: ProductListItem[] }>("/products?limit=100&sort=name_asc", { accessToken }).then((res) =>
      setProducts(res.items),
    );
  }, [accessToken]);

  // Depende de campos puntuales (no de `data` entero) a propósito: `data` cambia de referencia en
  // cada poll de la extracción, y si el efecto se disparara en cada uno pisaría lo que el admin
  // esté tipeando en el input aunque el proveedor real no haya cambiado.
  const importId = data?.import._id;
  const serverSupplier = data?.import.supplier;
  useEffect(() => {
    if (serverSupplier !== undefined) setSupplierInput(serverSupplier);
  }, [importId, serverSupplier]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm font-semibold text-destructive">{error ?? "No pudimos cargar la importación."}</p>;
  }

  const { import: imp, fileUrl, pricingDefaults } = data;

  async function handleSaveSupplier() {
    if (!accessToken || !id) return;
    setSavingSupplier(true);
    try {
      await updateImportHeader(id, { supplier: supplierInput.trim() }, accessToken);
      await refresh();
    } catch {
      // el input vuelve a mostrar el último valor confirmado en el próximo refresh
    } finally {
      setSavingSupplier(false);
    }
  }

  async function handleSaveLine(lineNumber: number, decision: LineDecisionInput) {
    if (!accessToken || !id) return;
    await patchLine(id, lineNumber, decision, accessToken);
    await refresh();
  }

  async function handleApply() {
    if (!accessToken || !id) return;
    setApplying(true);
    setApplyError(null);
    try {
      await applyImport(id, { notes: applyNotes }, accessToken);
      await refresh();
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : "No pudimos aplicar la importación.");
    } finally {
      setApplying(false);
    }
  }

  const linkedLines = imp.lines.filter((line) => line.decision.action === "link");
  const skippedCount = imp.lines.length - linkedLines.length;
  const totalCents = linkedLines.reduce((sum, line) => sum + line.decision.unitCost * line.decision.quantity, 0);
  const costUpdates = linkedLines.filter((line) => line.decision.updateCostPrice).length;
  const priceUpdates = linkedLines.filter((line) => line.decision.updateSalePrice).length;
  const canApply = imp.status === "review" && linkedLines.length > 0 && !!imp.supplier;

  return (
    <div>
      <Link to="/admin/compras/importaciones" className="text-sm text-muted-foreground hover:text-primary">
        ← Volver a importaciones
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Revisar factura</h1>
        <InvoiceImportStatusBadge status={imp.status} />
      </div>

      {(imp.status === "uploaded" || imp.status === "extracting") && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
          <p className="font-semibold">Un agente de IA está leyendo la factura...</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Puede tardar hasta un minuto. Esta página se actualiza sola, no hace falta que la recargues.
          </p>
        </div>
      )}

      {imp.status === "failed" && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-semibold text-destructive">La extracción falló</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {imp.extraction.lastError || "Ocurrió un error inesperado."}
          </p>
          <p className="mt-3 text-sm">
            Para reintentar, subí la misma factura de nuevo desde{" "}
            <Link to="/admin/compras/importaciones" className="font-semibold text-primary hover:underline">
              la pantalla de importaciones
            </Link>
            .
          </p>
        </div>
      )}

      {imp.status === "discarded" && (
        <p className="mt-6 text-sm text-muted-foreground">Esta importación fue descartada.</p>
      )}

      {imp.status === "applying" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
          <p className="font-semibold">Aplicando la importación...</p>
        </div>
      )}

      {imp.status === "applied" && (
        <div className="mt-6 rounded-xl border border-success/30 bg-success/5 p-4">
          <p className="font-semibold text-success">Importación aplicada correctamente.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Se registró la compra y se actualizó el stock.{" "}
            <Link to="/admin/compras" className="font-semibold text-primary hover:underline">
              Ver compras
            </Link>
          </p>
        </div>
      )}

      {(imp.status === "review" || imp.status === "applying" || imp.status === "applied") && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <FilePreview fileUrl={fileUrl} mimeType={imp.file.mimeType} />

            <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 text-sm">
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                Proveedor
                <div className="flex gap-2">
                  <input
                    value={supplierInput}
                    disabled={imp.status !== "review"}
                    onChange={(e) => setSupplierInput(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                  {imp.status === "review" && supplierInput.trim() !== imp.supplier && (
                    <Button type="button" size="sm" variant="outline" disabled={savingSupplier} onClick={() => void handleSaveSupplier()}>
                      Guardar
                    </Button>
                  )}
                </div>
              </label>
              <p className="mt-1 text-muted-foreground">
                {imp.documentType !== "desconocido" && <>Tipo: {imp.documentType} · </>}
                {imp.documentNumber && <>Nº {imp.documentNumber} · </>}
                Moneda: {imp.currency}
              </p>
              {imp.totals.total != null && <p className="font-semibold">Total factura: {formatARS(imp.totals.total)}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!products ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              imp.lines.map((line) => (
                <InvoiceLineRow
                  key={line.lineNumber}
                  line={line}
                  products={products}
                  pricingDefaults={pricingDefaults}
                  readOnly={imp.status !== "review"}
                  onSave={(decision) => handleSaveLine(line.lineNumber, decision)}
                />
              ))
            )}

            {imp.status === "review" && (
              <div className="mt-2 rounded-xl border border-border bg-card p-4">
                <p className="text-sm">
                  <strong>{imp.lines.length}</strong> líneas: <strong>{linkedLines.length}</strong> vincular,{" "}
                  <strong>{skippedCount}</strong> omitir · Total <strong>{formatARS(totalCents)}</strong> · se
                  actualizarán <strong>{costUpdates}</strong> costos y <strong>{priceUpdates}</strong> precios
                </p>

                <textarea
                  placeholder="Notas de la compra (opcional)"
                  rows={2}
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />

                {!imp.supplier && (
                  <p className="mt-2 text-xs font-semibold text-warning">Cargá el proveedor antes de aplicar.</p>
                )}
                {applyError && <p className="mt-2 text-sm font-semibold text-destructive">{applyError}</p>}

                <Button type="button" size="lg" className="mt-3" disabled={!canApply || applying} onClick={() => void handleApply()}>
                  {applying ? "Aplicando..." : "Aplicar importación"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
