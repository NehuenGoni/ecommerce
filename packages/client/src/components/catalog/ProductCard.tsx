import { formatARS } from "@growshop/shared";
import { Link } from "react-router-dom";
import { cheapestVariant, sortedImages } from "@/lib/catalog";
import type { ProductListItem } from "@/types/catalog";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";

export function ProductCard({ product }: { product: ProductListItem }) {
  const variant = cheapestVariant(product.variants);
  const image = sortedImages(product.images)[0];
  const isOutOfStock = variant.stock === 0;
  const isLowStock = !isOutOfStock && variant.stock <= variant.lowStockThreshold;

  return (
    <Link
      to={`/productos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden">
        {image ? (
          <img
            src={image.url}
            alt={image.alt || product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ProductImagePlaceholder />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.brand && (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        )}
        <h3 className="font-display font-bold leading-snug">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-mono text-lg">{formatARS(variant.price)}</span>
          {isOutOfStock ? (
            <span className="text-xs font-semibold text-destructive">Sin stock</span>
          ) : isLowStock ? (
            <span className="text-xs font-semibold text-warning">Últimas unidades</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
