import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ProductListItem } from "@/types/catalog";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name_asc";

export interface ProductQuery {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function buildQueryString(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  if (query.isFeatured !== undefined) params.set("isFeatured", String(query.isFeatured));
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return params.toString();
}

export function useProducts(query: ProductQuery): {
  data: ProductListResponse | null;
  loading: boolean;
  error: string | null;
} {
  const { q, category, minPrice, maxPrice, isFeatured, sort, page, limit } = query;
  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<ProductListResponse>(
      `/products?${buildQueryString({ q, category, minPrice, maxPrice, isFeatured, sort, page, limit })}`,
    )
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar los productos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, category, minPrice, maxPrice, isFeatured, sort, page, limit]);

  return { data, loading, error };
}
