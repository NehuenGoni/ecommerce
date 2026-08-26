import { useState } from "react";
import { AddressForm, type AddressFormValues } from "@/components/account/AddressForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import type { AuthUser, SavedAddress } from "@/types/auth";

export function AddressesPage() {
  const { user, accessToken, updateUser } = useAuth();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!user || !accessToken) return null;

  async function handleAdd(values: AddressFormValues) {
    const res = await apiFetch<{ user: AuthUser }>("/users/me/addresses", {
      method: "POST",
      accessToken: accessToken ?? undefined,
      body: JSON.stringify(values),
    });
    updateUser(res.user);
    setAdding(false);
  }

  async function handleEdit(addressId: string, values: AddressFormValues) {
    const res = await apiFetch<{ user: AuthUser }>(`/users/me/addresses/${addressId}`, {
      method: "PATCH",
      accessToken: accessToken ?? undefined,
      body: JSON.stringify(values),
    });
    updateUser(res.user);
    setEditingId(null);
  }

  async function handleDelete(addressId: string) {
    const res = await apiFetch<{ user: AuthUser }>(`/users/me/addresses/${addressId}`, {
      method: "DELETE",
      accessToken: accessToken ?? undefined,
    });
    updateUser(res.user);
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      {user.addresses.map((address: SavedAddress) =>
        editingId === address._id ? (
          <AddressForm
            key={address._id}
            initial={address}
            submitLabel="Guardar cambios"
            onSubmit={(values) => handleEdit(address._id, values)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={address._id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {address.label || "Dirección"}
                  {address.isDefault && (
                    <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                      Predeterminada
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {address.street}, {address.city}, {address.province} ({address.zipCode})
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingId(address._id)}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void handleDelete(address._id)}>
                Eliminar
              </Button>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <AddressForm submitLabel="Agregar dirección" onSubmit={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <Button variant="outline" className="w-fit" onClick={() => setAdding(true)}>
          Agregar dirección
        </Button>
      )}
    </div>
  );
}
