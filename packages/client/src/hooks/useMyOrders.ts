import type { Order } from "@growshop/shared";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface MyOrdersResponse {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useMyOrders(page: number): {
  data: MyOrdersResponse | null;
  loading: boolean;
} {
  const { accessToken } = useAuth();
  const [data, setData] = useState<MyOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<MyOrdersResponse>(`/orders/mine?page=${page}&limit=10`, { accessToken })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, page]);

  return { data, loading };
}
