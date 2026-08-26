import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PurchaseForm, type PurchaseFormValues } from "@/components/admin/PurchaseForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import type { ProductListItem } from "@/types/catalog";

export function PurchaseFormPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductListItem[] | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ items: ProductListItem[] }>("/products?limit=100&sort=name_asc", { accessToken }).then((res) =>
      setProducts(res.items),
    );
  }, [accessToken]);

  async function handleSubmit(values: PurchaseFormValues) {
    if (!accessToken) return;
    await apiFetch("/supplier-purchases", { method: "POST", accessToken, body: JSON.stringify(values) });
    navigate("/admin/compras");
  }

  return (
    <div>
      <Link to="/admin/compras" className="text-sm text-muted-foreground hover:text-primary">
        ← Volver a compras
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Registrar compra a proveedor</h1>

      <div className="mt-6">
        {!products ? <Skeleton className="h-64 w-full" /> : <PurchaseForm products={products} onSubmit={handleSubmit} />}
      </div>
    </div>
  );
}
