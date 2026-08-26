import { centsToPesos, formatARS, pesosToCents } from "@growshop/shared";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import type { ProductListItem } from "@/types/catalog";

interface PurchaseItemForm {
  product: string;
  variant: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseFormValues {
  supplier: string;
  items: PurchaseItemForm[];
  purchaseDate?: string;
  notes: string;
}

interface PurchaseFormProps {
  products: ProductListItem[];
  onSubmit: (values: PurchaseFormValues) => Promise<void>;
}

function emptyItem(): PurchaseItemForm {
  return { product: "", variant: "", quantity: 1, unitCost: 0 };
}

export function PurchaseForm({ products, onSubmit }: PurchaseFormProps) {
  const [supplier, setSupplier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemForm[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<PurchaseItemForm>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const totalCost = items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (items.some((item) => !item.product || !item.variant)) {
      setError("Elegí producto y variante en cada línea.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ supplier, items, purchaseDate: purchaseDate || undefined, notes });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar la compra. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Proveedor"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item, index) => {
          const product = products.find((p) => p._id === item.product);
          return (
            <div key={index} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Línea {index + 1}</p>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <select
                  required
                  value={item.product}
                  onChange={(e) => updateItem(index, { product: e.target.value, variant: "" })}
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
                  required
                  disabled={!product}
                  value={item.variant}
                  onChange={(e) => updateItem(index, { variant: e.target.value })}
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
                    required
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Costo unitario (ARS)
                  <input
                    required
                    type="number"
                    min={0}
                    value={centsToPesos(item.unitCost)}
                    onChange={(e) => updateItem(index, { unitCost: pesosToCents(Number(e.target.value)) })}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
              </div>
            </div>
          );
        })}

        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
          Agregar línea
        </Button>
      </div>

      <textarea
        placeholder="Notas (opcional)"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded-md border border-border bg-card px-3 py-2 text-sm"
      />

      <p className="text-sm font-semibold">Total: {formatARS(totalCost)}</p>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-fit" disabled={submitting}>
        {submitting ? "Registrando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
