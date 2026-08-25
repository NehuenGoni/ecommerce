import { Skeleton } from "@/components/ui/skeleton";
import type { ProductListItem } from "@/types/catalog";
import { ProductCard } from "./ProductCard";

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function ProductGrid({
  products,
  loading,
}: {
  products: ProductListItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">No encontramos productos con esos filtros.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
