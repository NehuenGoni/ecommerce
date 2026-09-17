import { applyMargin, centsToPesos, formatARS, pesosToCents, roundUpToStep, type SupplierInvoiceImportLine } from "@growshop/shared";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LineDecisionInput } from "@/lib/invoiceImports";
import { cn } from "@/lib/utils";
import type { ProductListItem } from "@/types/catalog";

interface InvoiceLineRowProps {
  line: SupplierInvoiceImportLine;
  products: ProductListItem[];
  pricingDefaults: { marginPercent: number; roundingStep: number };
  /** true una vez que la importación salió de "review" (aplicada, aplicándose, etc.) */
  readOnly: boolean;
  onSave: (decision: LineDecisionInput) => Promise<void>;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function percentDelta(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Cada línea tiene su propio estado local y su propio botón "Guardar" (en
 * vez de un único submit de todo el formulario, como PurchaseForm): permite
 * revisar y confirmar de a una sin perder el trabajo de las demás, y evita
 * que el refresh que dispara guardar una línea reinicie la edición en curso
 * de otra. Por eso el estado se inicializa una sola vez desde `line` y no
 * se resincroniza en cada re-render del padre.
 */
export function InvoiceLineRow({ line, products, pricingDefaults, readOnly, onSave }: InvoiceLineRowProps) {
  const [action, setAction] = useState<"link" | "skip">(line.decision.action);
  const [productId, setProductId] = useState(line.decision.product ?? "");
  const [variantSku, setVariantSku] = useState(line.decision.variantSku);
  const [quantity, setQuantity] = useState(line.decision.quantity);
  const [unitCostPesos, setUnitCostPesos] = useState(centsToPesos(line.decision.unitCost));
  const [marginPercent, setMarginPercent] = useState(line.decision.marginPercent ?? pricingDefaults.marginPercent);
  const [updateCostPrice, setUpdateCostPrice] = useState(line.decision.updateCostPrice);
  const [updateSalePrice, setUpdateSalePrice] = useState(line.decision.updateSalePrice);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = products.find((p) => p._id === productId);
  const unitCostCents = pesosToCents(unitCostPesos);
  const salePriceCents = roundUpToStep(applyMargin(unitCostCents, marginPercent), pricingDefaults.roundingStep);
  const costDelta = percentDelta(unitCostCents, line.match.currentCostPrice);
  const priceDelta = percentDelta(salePriceCents, line.match.currentPrice);

  async function handleSave() {
    setError(null);
    setSaved(false);

    if (action === "skip") {
      setSaving(true);
      try {
        await onSave({ action: "skip" });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar la línea.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!productId || !variantSku) {
      setError("Elegí un producto y una variante.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        action: "link",
        product: productId,
        variantSku,
        quantity,
        unitCost: unitCostCents,
        updateCostPrice,
        updateSalePrice,
        marginPercent,
        salePrice: salePriceCents,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la línea.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Lo que dice la factura -- inmutable, solo lectura */}
        <div className="sm:w-2/5">
          <p className="text-sm font-semibold">{line.raw.description}</p>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div>
              SKU proveedor: <span className="font-mono">{line.raw.supplierSku || "—"}</span>
            </div>
            <div>
              Cantidad: {line.raw.quantity} {line.raw.unit}
            </div>
            <div>Costo factura: {line.raw.unitCost != null ? formatARS(line.raw.unitCost) : "sin precio (remito)"}</div>
            <div>Confianza IA: {formatPercent(line.raw.modelConfidence)}</div>
          </dl>
          {line.raw.modelNotes && <p className="mt-1.5 text-xs italic text-muted-foreground">"{line.raw.modelNotes}"</p>}
          {line.match.status === "matched" ? (
            <p className="mt-1.5 text-xs font-semibold text-success">
              Match automático por {line.match.method === "barcode" ? "código de barras" : "SKU"}
            </p>
          ) : (
            <p className="mt-1.5 text-xs font-semibold text-warning">Sin match automático -- vinculá a mano</p>
          )}
        </div>

        {/* Decisión -- editable */}
        <div className="flex-1">
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setAction("link")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                action === "link" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              Vincular
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setAction("skip")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                action === "skip" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              Omitir
            </button>
          </div>

          {action === "link" && (
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <select
                disabled={readOnly}
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setVariantSku("");
                }}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
              >
                <option value="" disabled>
                  Producto
                </option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                disabled={readOnly || !product}
                value={variantSku}
                onChange={(e) => setVariantSku(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
              >
                <option value="" disabled>
                  Variante
                </option>
                {product?.variants.map((v) => (
                  <option key={v.sku} value={v.sku}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Cantidad
                <input
                  type="number"
                  min={1}
                  disabled={readOnly}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Costo unitario (ARS)
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={unitCostPesos}
                  onChange={(e) => setUnitCostPesos(Number(e.target.value))}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <div className="col-span-2 flex flex-col gap-1.5 rounded-md bg-muted/50 p-2.5 text-xs sm:col-span-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Costo: <strong>{formatARS(unitCostCents)}</strong>
                    {costDelta !== null && (
                      <span className={cn("ml-1", costDelta > 0 ? "text-warning" : "text-muted-foreground")}>
                        (antes {formatARS(line.match.currentCostPrice!)}, {costDelta >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(costDelta)}%)
                      </span>
                    )}
                  </span>
                  <label className="flex items-center gap-1.5 font-semibold text-foreground">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={updateCostPrice}
                      onChange={(e) => setUpdateCostPrice(e.target.checked)}
                    />
                    Actualizar costo
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-1.5">
                    Margen
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(Number(e.target.value))}
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-foreground"
                    />
                    % → Precio: <strong>{formatARS(salePriceCents)}</strong>
                    {priceDelta !== null && (
                      <span className={cn(priceDelta > 0 ? "text-warning" : "text-muted-foreground")}>
                        (antes {formatARS(line.match.currentPrice!)}, {priceDelta >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(priceDelta)}%)
                      </span>
                    )}
                  </span>
                  <label className="flex items-center gap-1.5 font-semibold text-foreground">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={updateSalePrice}
                      onChange={(e) => setUpdateSalePrice(e.target.checked)}
                    />
                    Actualizar precio
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3">
            <Button type="button" size="sm" variant="outline" disabled={readOnly || saving} onClick={() => void handleSave()}>
              {saving ? "Guardando..." : "Guardar línea"}
            </Button>
            {saved && !error && <span className="text-xs font-semibold text-success">Guardado</span>}
            {error && <span className="text-xs font-semibold text-destructive">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
