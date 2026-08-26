import type { Category, ProductImage } from "@growshop/shared";
import { type FormEvent, useState } from "react";
import { VariantsEditor, type VariantFormValue } from "@/components/admin/VariantsEditor";
import { ImagesEditor } from "@/components/admin/ImagesEditor";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { emptyVariant } from "@/lib/adminDefaults";
import type { ProductListItem } from "@/types/catalog";

export interface ProductFormValues {
  name: string;
  slug?: string;
  description: string;
  shortDescription: string;
  category: string;
  brand: string;
  variants: VariantFormValue[];
  images: ProductImage[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
}

interface ProductFormProps {
  initial?: ProductListItem;
  categories: Category[];
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

export function ProductForm({ initial, categories, submitLabel, onSubmit }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [category, setCategory] = useState(initial?.category._id ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [variants, setVariants] = useState<VariantFormValue[]>(initial?.variants ?? [emptyVariant()]);
  const [images, setImages] = useState<ProductImage[]>(initial?.images ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!category) {
      setError("Elegí una categoría.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name,
        slug: slug.trim() || undefined,
        description,
        shortDescription,
        category,
        brand,
        variants,
        images,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isActive,
        isFeatured,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el producto. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Datos generales</h2>
        <input
          required
          placeholder="Nombre del producto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Slug (opcional, se genera del nombre)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="Marca"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <select
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Elegir categoría
          </option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.parent ? `— ${cat.name}` : cat.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Descripción corta (catálogo)"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Descripción completa"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Tags separados por coma"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Activo (visible en la tienda)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
            Destacado
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Imágenes</h2>
        <ImagesEditor images={images} onChange={setImages} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Variantes</h2>
        <VariantsEditor variants={variants} lockStock={Boolean(initial)} onChange={setVariants} />
      </section>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-fit" disabled={submitting}>
        {submitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
