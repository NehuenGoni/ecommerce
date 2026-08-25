import { formatARS } from "@growshop/shared";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { useProduct } from "@/hooks/useProduct";
import { sortedImages } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { NotFound } from "./NotFound";

function ProductPageSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:grid-cols-2">
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-4 h-11 w-40" />
      </div>
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { product, loading, error } = useProduct(slug ?? "");
  const { addItem } = useCart();
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  const variant = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v) => v.sku === selectedSku) ?? product.variants[0] ?? null;
  }, [product, selectedSku]);

  const images = useMemo(() => sortedImages(product?.images ?? []), [product]);

  if (loading) {
    return <ProductPageSkeleton />;
  }

  if (error || !product || !variant) {
    return <NotFound />;
  }

  const isOutOfStock = variant.stock === 0;
  const isLowStock = !isOutOfStock && variant.stock <= variant.lowStockThreshold;
  const currentImage = images[activeImage];

  async function handleAddToCart() {
    setAdding(true);
    try {
      // product/variant ya están garantizados no-null por el guard de arriba,
      // pero TS no propaga esa narrowing dentro de esta función anidada.
      await addItem(product!, variant!, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <Link to={`/categoria/${product.category.slug}`} className="hover:text-primary">
          {product.category.name}
        </Link>
      </nav>

      <div className="mt-4 grid gap-10 sm:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.alt || product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sin imagen</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((image, index) => (
                <button
                  key={image.url + index}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    "h-16 w-16 overflow-hidden rounded-lg border-2",
                    index === activeImage ? "border-primary" : "border-transparent",
                  )}
                  aria-label={`Ver imagen ${index + 1}`}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brand && (
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">{product.brand}</p>
          )}
          <h1 className="mt-1 font-display text-3xl font-bold text-balance">{product.name}</h1>
          {product.shortDescription && <p className="mt-2 text-muted-foreground">{product.shortDescription}</p>}

          <p className="mt-6 font-mono text-3xl">{formatARS(variant.price)}</p>

          {product.variants.length > 1 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Variante</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.sku}
                    type="button"
                    onClick={() => {
                      setSelectedSku(v.sku);
                      setQuantity(1);
                    }}
                    className={cn(
                      "rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors",
                      v.sku === variant.sku
                        ? "border-primary text-primary"
                        : "border-border text-foreground hover:border-secondary",
                    )}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-md border border-border">
              <button
                type="button"
                onClick={() => setQuantity((qty) => Math.max(1, qty - 1))}
                className="px-3 py-2 text-lg leading-none"
                aria-label="Restar cantidad"
              >
                −
              </button>
              <span className="w-8 text-center font-mono">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((qty) => Math.min(variant.stock, qty + 1))}
                className="px-3 py-2 text-lg leading-none"
                aria-label="Sumar cantidad"
                disabled={quantity >= variant.stock}
              >
                +
              </button>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={isOutOfStock || adding}
              onClick={() => void handleAddToCart()}
              className="flex-1"
            >
              {added ? "¡Agregado!" : isOutOfStock ? "Sin stock" : adding ? "Agregando..." : "Agregar al carrito"}
            </Button>
          </div>

          {isLowStock && <p className="mt-2 text-sm font-semibold text-warning">Quedan {variant.stock} unidades</p>}

          {product.description && (
            <div className="mt-8 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
              {product.description
                .split("\n")
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i} className="mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
