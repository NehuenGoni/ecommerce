import type { Category } from "@growshop/shared";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function useCategories(): { categories: Category[]; loading: boolean } {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiFetch<{ categories: Category[] }>("/categories?parent=null")
      .then((data) => {
        if (!cancelled) setCategories(data.categories);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}
