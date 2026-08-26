import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SavedAddress } from "@/types/auth";

export interface AddressFormValues {
  label: string;
  street: string;
  city: string;
  province: string;
  zipCode: string;
  isDefault: boolean;
}

interface AddressFormProps {
  initial?: SavedAddress;
  submitLabel: string;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel: () => void;
}

export function AddressForm({ initial, submitLabel, onSubmit, onCancel }: AddressFormProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [zipCode, setZipCode] = useState(initial?.zipCode ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ label, street, city, province, zipCode, isDefault });
    } catch {
      setError("No pudimos guardar la dirección. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <input
        placeholder="Etiqueta (ej. Casa, Trabajo)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="Calle y número"
        value={street}
        onChange={(e) => setStreet(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          required
          placeholder="Ciudad"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Provincia"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <input
        required
        placeholder="Código postal"
        value={zipCode}
        onChange={(e) => setZipCode(e.target.value)}
        className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Usar como dirección predeterminada
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
