import type { Supplier } from "@growshop/shared";
import { useState } from "react";
import { SupplierForm, type SupplierFormValues } from "@/components/admin/SupplierForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminSuppliers } from "@/hooks/admin/useAdminSuppliers";
import { ApiError, apiFetch } from "@/lib/api";

function SupplierRow({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="font-semibold">
          {supplier.name}
          {!supplier.isActive && (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              Inactivo
            </span>
          )}
        </p>
        {(supplier.contactName || supplier.phone || supplier.email) && (
          <p className="text-xs text-muted-foreground">
            {[supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(" · ")}
          </p>
        )}
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

export function SuppliersPage() {
  const { accessToken } = useAuth();
  const { suppliers, loading, refresh } = useAdminSuppliers();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!accessToken) return null;

  async function handleCreate(values: SupplierFormValues) {
    await apiFetch("/suppliers", { method: "POST", accessToken: accessToken ?? undefined, body: JSON.stringify(values) });
    setAdding(false);
    refresh();
  }

  async function handleUpdate(id: string, values: SupplierFormValues) {
    await apiFetch(`/suppliers/${id}`, {
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
      await apiFetch(`/suppliers/${id}`, { method: "DELETE", accessToken: accessToken ?? undefined });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos eliminar el proveedor.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Proveedores</h1>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            Nuevo proveedor
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}

      {adding && (
        <div className="mt-4">
          <SupplierForm submitLabel="Crear proveedor" onSubmit={handleCreate} onCancel={() => setAdding(false)} />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : suppliers.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">Todavía no hay proveedores.</p>
        ) : (
          suppliers.map((supplier) =>
            editingId === supplier._id ? (
              <SupplierForm
                key={supplier._id}
                initial={supplier}
                submitLabel="Guardar cambios"
                onSubmit={(values) => handleUpdate(supplier._id, values)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <SupplierRow
                key={supplier._id}
                supplier={supplier}
                onEdit={() => setEditingId(supplier._id)}
                onDelete={() => void handleDelete(supplier._id)}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}
