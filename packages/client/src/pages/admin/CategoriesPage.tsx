import type { Category } from "@growshop/shared";
import { useState } from "react";
import { CategoryForm, type CategoryFormValues } from "@/components/admin/CategoryForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCategories } from "@/hooks/admin/useAdminCategories";
import { ApiError, apiFetch } from "@/lib/api";

function CategoryRow({
  category,
  indent,
  onEdit,
  onDelete,
}: {
  category: Category;
  indent: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 ${indent ? "ml-6" : ""}`}
    >
      <div>
        <p className="font-semibold">
          {category.name}
          {!category.isActive && (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              Inactiva
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">/{category.slug}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          Editar
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const { accessToken } = useAuth();
  const { categories, loading, refresh } = useAdminCategories();
  const [adding, setAdding] = useState<string | null | false>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!accessToken) return null;

  const roots = categories.filter((c) => !c.parent);
  const rootOptions = roots;

  async function handleCreate(values: CategoryFormValues) {
    await apiFetch("/categories", { method: "POST", accessToken: accessToken ?? undefined, body: JSON.stringify(values) });
    setAdding(false);
    refresh();
  }

  async function handleUpdate(id: string, values: CategoryFormValues) {
    await apiFetch(`/categories/${id}`, {
      method: "PATCH",
      accessToken: accessToken ?? undefined,
      body: JSON.stringify(values),
    });
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiFetch(`/categories/${id}`, { method: "DELETE", accessToken: accessToken ?? undefined });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos eliminar la categoría.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Categorías</h1>
        {adding === false && (
          <Button size="sm" onClick={() => setAdding(null)}>
            Nueva categoría
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}

      {adding !== false && (
        <div className="mt-4">
          <CategoryForm
            rootOptions={rootOptions}
            submitLabel="Crear categoría"
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : roots.length === 0 && adding === false ? (
          <p className="text-sm text-muted-foreground">Todavía no hay categorías.</p>
        ) : (
          roots.map((root) => (
            <div key={root._id} className="flex flex-col gap-2">
              {editingId === root._id ? (
                <CategoryForm
                  initial={root}
                  rootOptions={rootOptions.filter((c) => c._id !== root._id)}
                  submitLabel="Guardar cambios"
                  onSubmit={(values) => handleUpdate(root._id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <CategoryRow
                  category={root}
                  indent={false}
                  onEdit={() => setEditingId(root._id)}
                  onDelete={() => void handleDelete(root._id)}
                />
              )}

              {categories
                .filter((c) => c.parent === root._id)
                .map((child) =>
                  editingId === child._id ? (
                    <div key={child._id} className="ml-6">
                      <CategoryForm
                        initial={child}
                        rootOptions={rootOptions.filter((c) => c._id !== child._id)}
                        submitLabel="Guardar cambios"
                        onSubmit={(values) => handleUpdate(child._id, values)}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <CategoryRow
                      key={child._id}
                      category={child}
                      indent
                      onEdit={() => setEditingId(child._id)}
                      onDelete={() => void handleDelete(child._id)}
                    />
                  ),
                )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
