import { useState } from "react";
import { centsToPesos, markupFromPrice, pesosToCents, priceFromMarkup } from "@growshop/shared";
import type { ProductVariant } from "@growshop/shared";
import { Button } from "@/components/ui/button";
import { emptyVariant } from "@/lib/adminDefaults";

export type VariantFormValue = ProductVariant;

interface VariantsEditorProps {
  variants: VariantFormValue[];
  /** false al crear (se puede fijar el stock inicial); true al editar (el stock solo cambia desde Inventario/Compras) */
  lockStock: boolean;
  onChange: (variants: VariantFormValue[]) => void;
}

export function VariantsEditor({ variants, lockStock, onChange }: VariantsEditorProps) {
  // Lo que el admin está tipeando en el campo de markup, por índice de variante. El
  // markup no se persiste (se deriva de price/costPrice); el borrador evita que el
  // input "salte" mientras se tipea, porque el precio se redondea al peso.
  const [markupDraft, setMarkupDraft] = useState<Record<number, string>>({});

  function updateMarkup(index: number, raw: string) {
    setMarkupDraft((d) => ({ ...d, [index]: raw }));
    const pct = Number(raw.replace(",", "."));
    if (raw.trim() === "" || !Number.isFinite(pct)) return;
    updateVariant(index, { price: priceFromMarkup(variants[index].costPrice, pct) });
  }

  function clearMarkupDraft(index: number) {
    setMarkupDraft((d) => {
      const { [index]: _removed, ...rest } = d;
      return rest;
    });
  }

  function updateVariant(index: number, patch: Partial<VariantFormValue>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {variants.map((variant, index) => (
        <div key={index} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Variante {index + 1}</p>
            {variants.length > 1 && (
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                Quitar
              </button>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <input
              required
              placeholder="SKU"
              value={variant.sku}
              onChange={(e) => updateVariant(index, { sku: e.target.value })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Nombre (ej. 1kg)"
              value={variant.name}
              onChange={(e) => updateVariant(index, { name: e.target.value })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
            />
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Precio de venta (ARS)
              <input
                required
                type="number"
                min={0}
                value={centsToPesos(variant.price)}
                onChange={(e) => updateVariant(index, { price: pesosToCents(Number(e.target.value)) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Markup sobre costo (%)
              <input
                type="text"
                inputMode="decimal"
                disabled={variant.costPrice <= 0}
                placeholder={variant.costPrice <= 0 ? "Cargá el costo" : ""}
                value={markupDraft[index] ?? markupFromPrice(variant.costPrice, variant.price) ?? ""}
                onChange={(e) => updateMarkup(index, e.target.value)}
                onBlur={() => clearMarkupDraft(index)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Costo (ARS)
              <input
                required
                type="number"
                min={0}
                value={centsToPesos(variant.costPrice)}
                onChange={(e) => updateVariant(index, { costPrice: pesosToCents(Number(e.target.value)) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Peso (kg)
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={variant.weight}
                onChange={(e) => updateVariant(index, { weight: Number(e.target.value) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {lockStock ? "Stock actual" : "Stock inicial"}
              <input
                type="number"
                min={0}
                disabled={lockStock}
                value={variant.stock}
                onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Alerta de stock bajo
              <input
                required
                type="number"
                min={0}
                value={variant.lowStockThreshold}
                onChange={(e) => updateVariant(index, { lowStockThreshold: Number(e.target.value) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Código de barras (opcional)
              <input
                value={variant.barcode ?? ""}
                onChange={(e) => updateVariant(index, { barcode: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
          </div>
          {lockStock && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              El stock se ajusta desde Inventario o registrando una compra a proveedor.
            </p>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...variants, emptyVariant()])}>
        Agregar variante
      </Button>
    </div>
  );
}
