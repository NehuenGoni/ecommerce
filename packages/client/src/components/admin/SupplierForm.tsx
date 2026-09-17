import type { Supplier } from "@growshop/shared";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

export interface SupplierFormValues {
  name: string;
  taxId: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
}

interface SupplierFormProps {
  initial?: Supplier;
  submitLabel: string;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onCancel: () => void;
}

export function SupplierForm({ initial, submitLabel, onSubmit, onCancel }: SupplierFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [taxId, setTaxId] = useState(initial?.taxId ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ name, taxId, contactName, phone, email, address, notes, isActive });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el proveedor. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <input
        required
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          placeholder="CUIT / identificación fiscal"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Persona de contacto"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <input
        placeholder="Dirección"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        placeholder="Notas"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Activo
      </label>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Guardando..." : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
