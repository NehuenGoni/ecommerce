import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCategories } from "@/hooks/admin/useAdminCategories";
import { apiFetch } from "@/lib/api";
import type { ProductListItem } from "@/types/catalog";
import { NotFound } from "@/pages/NotFound";

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { accessToken } = useAuth();
  const { categories, loading: loadingCategories } = useAdminCategories();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !accessToken) return;
    apiFetch<{ product: ProductListItem }>(`/products/${id}`, { accessToken })
      .then((res) => setProduct(res.product))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  async function handleSubmit(values: ProductFormValues) {
    if (!accessToken) return;
    if (isEditing && id) {
      await apiFetch(`/products/${id}`, { method: "PATCH", accessToken, body: JSON.stringify(values) });
    } else {
      await apiFetch("/products", { method: "POST", accessToken, body: JSON.stringify(values) });
    }
    navigate("/admin/productos");
  }

  if (isEditing && notFound) return <NotFound />;
  if (isEditing && (loading || loadingCategories || !product)) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div>
      <Link to="/admin/productos" className="text-sm text-muted-foreground hover:text-primary">
        ← Volver a productos
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">
        {isEditing ? "Editar producto" : "Nuevo producto"}
      </h1>

      <div className="mt-6">
        <ProductForm
          initial={product ?? undefined}
          categories={categories}
          submitLabel={isEditing ? "Guardar cambios" : "Crear producto"}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
