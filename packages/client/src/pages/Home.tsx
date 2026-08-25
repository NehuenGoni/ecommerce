import { Link } from "react-router-dom";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";

export function Home() {
  const { categories } = useCategories();
  const { data, loading } = useProducts({ isFeatured: true, limit: 8 });

  const hasFeatured = loading || (data?.items.length ?? 0) > 0;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="text-xs font-bold uppercase tracking-wider text-secondary">GBA Norte</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-display font-extrabold tracking-tight text-balance sm:text-5xl">
          Insumos de cultivo, sin vueltas.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Fertilizantes, sustratos e iluminación con envío por moto o retiro en punto.
        </p>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="font-display text-2xl font-bold">Categorías</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/categoria/${category.slug}`}
                className="rounded-xl border border-border bg-card px-4 py-6 text-center font-display font-semibold transition-colors hover:border-secondary"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasFeatured && (
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <h2 className="font-display text-2xl font-bold">Destacados</h2>
          <div className="mt-5">
            <ProductGrid products={data?.items ?? []} loading={loading} />
          </div>
        </section>
      )}
    </>
  );
}
