import type { Category } from "@growshop/shared";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

/** Todas las categorías (raíz + subcategorías, activas e inactivas) para uso en admin. */
export function useAdminCategories(): {
  categories: Category[];
  loading: boolean;
  refresh: () => void;
} {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    apiFetch<{ categories: Category[] }>("/categories?includeInactive=true", { accessToken })
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories, loading, refresh };
}
