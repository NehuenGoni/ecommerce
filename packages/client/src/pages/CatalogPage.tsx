import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductFilters } from "@/components/catalog/ProductFilters";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { useCategories } from "@/hooks/useCategories";
import { useProducts, type ProductSort } from "@/hooks/useProducts";

const PAGE_SIZE = 12;

export function CatalogPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();

  const q = searchParams.get("q") ?? undefined;
  const sort = (searchParams.get("sort") as ProductSort | null) ?? "newest";
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;

  const category = useMemo(() => categories.find((c) => c.slug === slug), [categories, slug]);

  const { data, loading, error } = useProducts({
    q,
    category: slug,
    minPrice,
    maxPrice,
    sort,
    page,
    limit: PAGE_SIZE,
  });

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in updates)) next.delete("page");
    setSearchParams(next);
  }

  const title = slug ? (category?.name ?? "Categoría") : q ? `Resultados para "${q}"` : "Catálogo";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-balance">{title}</h1>
      {!loading && data && (
        <p className="mt-1 text-sm text-muted-foreground">
          {data.total} producto{data.total === 1 ? "" : "s"}
        </p>
      )}

      <ProductFilters
        sort={sort}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onSortChange={(value) => updateParams({ sort: value })}
        onPriceChange={(min, max) =>
          updateParams({ minPrice: min !== undefined ? String(min) : undefined, maxPrice: max !== undefined ? String(max) : undefined })
        }
      />

      {error ? (
        <p className="py-16 text-center text-destructive">{error}</p>
      ) : (
        <>
          <div className="mt-6">
            <ProductGrid products={data?.items ?? []} loading={loading} />
          </div>
          {data && data.pages > 1 && (
            <Pagination page={data.page} pages={data.pages} onPageChange={(p) => updateParams({ page: String(p) })} />
          )}
        </>
      )}
    </div>
  );
}
