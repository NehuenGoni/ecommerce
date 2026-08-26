import type { Category } from "@growshop/shared";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

export interface CategoryFormValues {
  name: string;
  slug?: string;
  description: string;
  image: string;
  parent: string | null;
  order: number;
  isActive: boolean;
}

interface CategoryFormProps {
  initial?: Category;
  /** Categorías raíz disponibles para elegir como padre (nunca la propia categoría en edición). */
  rootOptions: Category[];
  submitLabel: string;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
}

export function CategoryForm({ initial, rootOptions, submitLabel, onSubmit, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [parent, setParent] = useState(initial?.parent ?? "");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        slug: slug.trim() || undefined,
        description,
        image,
        parent: parent || null,
        order,
        isActive,
      });
    } catch {
      setError("No pudimos guardar la categoría. Probá de nuevo.");
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
      <input
        placeholder="Slug (opcional, se genera del nombre)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        placeholder="Descripción"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        placeholder="URL de imagen (opcional)"
        value={image}
        onChange={(e) => setImage(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          value={parent ?? ""}
          onChange={(e) => setParent(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Categoría raíz</option>
          {rootOptions.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Orden"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Activa (visible en el catálogo)
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
