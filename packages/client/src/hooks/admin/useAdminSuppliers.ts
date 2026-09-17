import type { Supplier } from "@growshop/shared";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

/** Todos los proveedores (activos e inactivos) para uso en admin. */
export function useAdminSuppliers(): {
  suppliers: Supplier[];
  loading: boolean;
  refresh: () => void;
} {
  const { accessToken } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    apiFetch<{ suppliers: Supplier[] }>("/suppliers?includeInactive=true", { accessToken })
      .then((res) => setSuppliers(res.suppliers))
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { suppliers, loading, refresh };
}
