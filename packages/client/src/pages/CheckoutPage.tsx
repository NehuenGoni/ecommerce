import { formatARS } from "@growshop/shared";
import { type FormEvent, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { ApiError, apiFetch } from "@/lib/api";
import { estimateShippingCost, SHIPPING_METHOD_LABELS, type ShippingMethod } from "@/lib/shipping";
import { cn } from "@/lib/utils";

type PaymentMethod = "mercadopago" | "transfer" | "cash";

interface CheckoutOrderResponse {
  order: { _id: string };
  paymentRedirectUrl?: string;
}

const SHIPPING_METHODS: ShippingMethod[] = ["moto", "pickup", "mercadoenvios"];

export function CheckoutPage() {
  const { user, accessToken, initializing } = useAuth();
  const { items, subtotal, loading: cartLoading, refresh } = useCart();
  const navigate = useNavigate();

  // null = "todavía no eligió explícitamente": se deriva de `user` en cada
  // render en vez de fijarse una sola vez con un lazy initializer de
  // useState. Justo después de un reload, `user` sigue siendo null en el
  // primer render (AuthContext todavía no resolvió /auth/refresh) y este
  // componente no se vuelve a montar cuando `user` aparece — un lazy
  // initializer se hubiera quedado pegado en "new" para siempre.
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("moto");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercadopago");
  const [customerNotes, setCustomerNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cashDisabled = shippingMethod === "mercadoenvios";
  const shippingCost = estimateShippingCost(shippingMethod);
  const total = subtotal + shippingCost;

  const unavailableItems = useMemo(() => items.filter((item) => !item.available), [items]);
  const effectiveAddressId =
    selectedAddressId ?? user?.addresses.find((a) => a.isDefault)?._id ?? user?.addresses[0]?._id ?? "new";
  const selectedAddress = user?.addresses.find((a) => a._id === effectiveAddressId);

  if (initializing || cartLoading) return null;
  if (!user) return <Navigate to="/login?redirect=/checkout" replace />;
  if (items.length === 0) return <Navigate to="/carrito" replace />;

  function handleShippingMethodChange(method: ShippingMethod) {
    setShippingMethod(method);
    if (method === "mercadoenvios" && paymentMethod === "cash") {
      setPaymentMethod("mercadopago");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (unavailableItems.length > 0) {
      setError("Hay productos en tu carrito sin stock suficiente. Volvé al carrito para ajustarlos.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<CheckoutOrderResponse>("/checkout", {
        method: "POST",
        accessToken: accessToken ?? undefined,
        body: JSON.stringify({
          shippingAddress: selectedAddress
            ? {
                label: selectedAddress.label,
                street: selectedAddress.street,
                city: selectedAddress.city,
                province: selectedAddress.province,
                zipCode: selectedAddress.zipCode,
              }
            : { street, city, province, zipCode },
          shippingMethod,
          paymentMethod,
          customerNotes,
        }),
      });

      if (result.paymentRedirectUrl) {
        window.location.href = result.paymentRedirectUrl;
        return;
      }

      // Navegar primero: el pedido ya vació el carrito en el backend, y si
      // refrescáramos acá antes de navegar, items.length pasaría a 0 mientras
      // CheckoutPage sigue montado — su propio guard de "carrito vacío"
      // dispararía un <Navigate to="/carrito"> que le gana de mano a esta
      // navegación explícita. refresh() corre en segundo plano después,
      // solo para que el badge del carrito en el header quede al día.
      navigate(`/pedidos/${result.order._id}`, { replace: true });
      void refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos crear tu pedido. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Finalizar compra</h1>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="font-display text-lg font-bold">Dirección de envío</h2>

            {user.addresses.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {user.addresses.map((address) => (
                  <label
                    key={address._id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-md border px-4 py-3 text-sm",
                      effectiveAddressId === address._id ? "border-primary" : "border-border",
                    )}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      className="mt-1"
                      checked={effectiveAddressId === address._id}
                      onChange={() => setSelectedAddressId(address._id)}
                    />
                    <span>
                      <span className="font-semibold">{address.label || "Dirección"}</span>
                      <br />
                      <span className="text-muted-foreground">
                        {address.street}, {address.city}, {address.province} ({address.zipCode})
                      </span>
                    </span>
                  </label>
                ))}
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md border px-4 py-3 text-sm font-medium",
                    effectiveAddressId === "new" ? "border-primary" : "border-border",
                  )}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={effectiveAddressId === "new"}
                    onChange={() => setSelectedAddressId("new")}
                  />
                  Usar otra dirección
                </label>
              </div>
            )}

            {effectiveAddressId === "new" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  required
                  placeholder="Calle y número"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm sm:col-span-2"
                />
                <input
                  required
                  placeholder="Ciudad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
                <input
                  required
                  placeholder="Provincia"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
                <input
                  required
                  placeholder="Código postal"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-lg font-bold">Método de envío</h2>
            <div className="mt-3 flex flex-col gap-2">
              {SHIPPING_METHODS.map((method) => (
                <label
                  key={method}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-sm",
                    shippingMethod === method ? "border-primary" : "border-border",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === method}
                      onChange={() => handleShippingMethodChange(method)}
                    />
                    {SHIPPING_METHOD_LABELS[method]}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {method === "mercadoenvios" ? "A cotizar" : formatARS(estimateShippingCost(method))}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold">Método de pago</h2>
            <div className="mt-3 flex flex-col gap-2">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium",
                  paymentMethod === "mercadopago" ? "border-primary" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "mercadopago"}
                  onChange={() => setPaymentMethod("mercadopago")}
                />
                Mercado Pago
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium",
                  paymentMethod === "transfer" ? "border-primary" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "transfer"}
                  onChange={() => setPaymentMethod("transfer")}
                />
                Transferencia bancaria
              </label>
              <label
                className={cn(
                  "flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium",
                  cashDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                  paymentMethod === "cash" ? "border-primary" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  disabled={cashDisabled}
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                />
                Efectivo en entrega/retiro
              </label>
              {cashDisabled && (
                <p className="text-xs text-muted-foreground">
                  El pago en efectivo solo está disponible con envío en moto o retiro en punto.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold">Notas (opcional)</h2>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
              placeholder="Referencias para la entrega, horarios, etc."
              className="mt-3 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Resumen</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {items.map((item) => (
              <li key={`${item.product.id}-${item.variant.sku}`} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.product.name} ({item.variant.name})
                </span>
                <span className="font-mono">{formatARS(item.subtotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatARS(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span className="font-mono">
                {shippingMethod === "mercadoenvios" ? "A cotizar" : formatARS(shippingCost)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="font-mono">{formatARS(total)}</span>
            </div>
          </div>

          {error && <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
            {submitting ? "Confirmando..." : "Confirmar pedido"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
