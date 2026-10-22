import { applyMargin, centsToPesos, formatARS, pesosToCents, roundUpToStep } from "@growshop/shared";
import type { PricingSettings } from "@growshop/shared";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch } from "@/lib/api";

const EXAMPLE_COST_CENTS = 100000;

export function SettingsPage() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [margin, setMargin] = useState("");
  const [roundingPesos, setRoundingPesos] = useState("");
  const [autoPrice, setAutoPrice] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ settings: { pricing: PricingSettings } }>("/settings", { accessToken })
      .then(({ settings }) => {
        setMargin(String(settings.pricing.marginPercent));
        setRoundingPesos(String(centsToPesos(settings.pricing.roundingStep)));
        setAutoPrice(settings.pricing.autoPriceOnPurchase);
      })
      .catch(() => setMessage({ type: "error", text: "No pudimos cargar la configuración." }))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (!accessToken) return null;

  const marginNumber = Number(margin.replace(",", "."));
  const roundingNumber = Number(roundingPesos.replace(",", "."));
  const marginValid = margin.trim() !== "" && Number.isFinite(marginNumber) && marginNumber >= 0 && marginNumber <= 1000;
  const roundingValid = Number.isInteger(roundingNumber) && roundingNumber >= 1;
  const formValid = marginValid && roundingValid;

  const examplePrice = formValid
    ? roundUpToStep(applyMargin(EXAMPLE_COST_CENTS, marginNumber), pesosToCents(roundingNumber))
    : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/settings/pricing", {
        method: "PUT",
        accessToken: accessToken ?? undefined,
        body: JSON.stringify({
          marginPercent: marginNumber,
          roundingStep: pesosToCents(roundingNumber),
          autoPriceOnPurchase: autoPrice,
        }),
      });
      setMessage({ type: "ok", text: "Configuración guardada." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "No pudimos guardar la configuración." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Configuración</h1>

      <form onSubmit={handleSave} className="mt-4 max-w-xl rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">Precios de venta</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Se usan para calcular el precio de venta a partir del costo en las compras a proveedor y en la importación de
          facturas. Cambiarlos no modifica los precios que ya están cargados.
        </p>

        {loading ? (
          <Skeleton className="mt-4 h-40 w-full" />
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Margen sobre el costo (%)
              <input
                type="text"
                inputMode="decimal"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              {!marginValid && <span className="text-destructive">Ingresá un número entre 0 y 1000.</span>}
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Redondear el precio hacia arriba a múltiplos de (ARS)
              <input
                type="text"
                inputMode="numeric"
                value={roundingPesos}
                onChange={(e) => setRoundingPesos(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              {!roundingValid && <span className="text-destructive">Ingresá un entero de al menos 1.</span>}
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoPrice}
                onChange={(e) => setAutoPrice(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Recalcular el precio de venta al registrar una compra
                <span className="block text-xs text-muted-foreground">
                  Si lo desactivás, las compras solo actualizan el costo y el precio se mantiene como está.
                </span>
              </span>
            </label>

            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              Ejemplo: costo {formatARS(EXAMPLE_COST_CENTS)} →{" "}
              <strong>{examplePrice !== null ? formatARS(examplePrice) : "—"}</strong>
            </p>

            {message && (
              <p className={message.type === "ok" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
                {message.text}
              </p>
            )}

            <Button type="submit" disabled={!formValid || saving} className="w-fit">
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
