import { formatARS } from "@growshop/shared";
import { Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ProductImagePlaceholder } from "@/components/catalog/ProductImagePlaceholder";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";

export function CartPage() {
  const { items, loading, subtotal, setQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 flex flex-col gap-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Tu carrito está vacío</h1>
        <p className="mt-2 text-muted-foreground">Todavía no agregaste ningún producto.</p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Tu carrito</h1>

      <ul className="mt-6 flex flex-col divide-y divide-border border-y border-border">
        {items.map((item) => (
          <li key={`${item.product.id}-${item.variant.sku}`} className="flex items-center gap-4 py-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
              {item.product.image ? (
                <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
              ) : (
                <ProductImagePlaceholder />
              )}
            </div>

            <div className="flex-1">
              <Link to={`/productos/${item.product.slug}`} className="font-display font-bold hover:text-primary">
                {item.product.name}
              </Link>
              <p className="text-sm text-muted-foreground">{item.variant.name}</p>
              {!item.available && (
                <p className="mt-1 text-xs font-semibold text-destructive">
                  Ya no hay stock suficiente — ajustá la cantidad
                </p>
              )}
              <div className="mt-2 flex items-center rounded-md border border-border w-fit">
                <button
                  type="button"
                  onClick={() => void setQuantity(item.product.id, item.variant.sku, item.quantity - 1)}
                  className="px-2.5 py-1 text-base leading-none"
                  aria-label="Restar cantidad"
                >
                  −
                </button>
                <span className="w-7 text-center font-mono text-sm">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => void setQuantity(item.product.id, item.variant.sku, item.quantity + 1)}
                  className="px-2.5 py-1 text-base leading-none"
                  aria-label="Sumar cantidad"
                  disabled={item.quantity >= item.variant.stock}
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="font-mono font-semibold">{formatARS(item.subtotal)}</span>
              <button
                type="button"
                onClick={() => void removeItem(item.product.id, item.variant.sku)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Quitar ${item.product.name} del carrito`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-lg font-semibold">Subtotal</span>
        <span className="font-mono text-xl">{formatARS(subtotal)}</span>
      </div>

      <Button size="lg" className="mt-6 w-full" onClick={() => navigate("/checkout")}>
        Continuar con la compra
      </Button>
    </div>
  );
}
