import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ProductListItem } from "@/types/catalog";

export function useProduct(slug: string): {
  product: ProductListItem | null;
  loading: boolean;
  error: string | null;
} {
  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<{ product: ProductListItem }>(`/products/${slug}`)
      .then((res) => {
        if (!cancelled) setProduct(res.product);
      })
      .catch(() => {
        if (!cancelled) setError("Producto no encontrado.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, loading, error };
}
