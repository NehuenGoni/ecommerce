import type { Category } from "@growshop/shared";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { uploadImage } from "@/lib/upload";

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
  const { accessToken } = useAuth();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [externalUrl, setExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parent, setParent] = useState(initial?.parent ?? "");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file, accessToken, "categories");
      setImage(url);
    } catch {
      setUploadError("No pudimos subir la imagen. Probá de nuevo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function addExternalUrl() {
    if (!externalUrl.trim()) return;
    setImage(externalUrl.trim());
    setExternalUrl("");
  }

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
      <div className="flex flex-col gap-2">
        {image && (
          <div className="w-32 rounded-lg border border-border p-2">
            <img src={image} alt="" className="h-24 w-full rounded-md object-cover" />
            <button
              type="button"
              onClick={() => setImage("")}
              className="mt-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive"
            >
              Quitar
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold">
            <span className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-2 hover:bg-muted">
              {uploading ? "Subiendo..." : "Subir imagen"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void handleFileUpload(e)}
            />
          </label>
          <input
            placeholder="o pegá una URL externa"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            className="min-w-[12rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={addExternalUrl}>
            Agregar URL
          </Button>
        </div>
        {uploadError && <p className="text-sm font-semibold text-destructive">{uploadError}</p>}
      </div>
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
