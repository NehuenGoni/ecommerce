import type { ProductImage } from "@growshop/shared";
import { type ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { uploadImage } from "@/lib/upload";

interface ImagesEditorProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}

export function ImagesEditor({ images, onChange }: ImagesEditorProps) {
  const { accessToken } = useAuth();
  const [externalUrl, setExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addImage(image: ProductImage) {
    onChange([...images, { ...image, order: images.length }]);
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, accessToken, "products");
      addImage({ url, source: "cloudinary", alt: "", order: 0 });
    } catch {
      setError("No pudimos subir la imagen. Probá de nuevo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function addExternalUrl() {
    if (!externalUrl.trim()) return;
    addImage({ url: externalUrl.trim(), source: "external", alt: "", order: 0 });
    setExternalUrl("");
  }

  function updateAlt(index: number, alt: string) {
    onChange(images.map((img, i) => (i === index ? { ...img, alt } : img)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next.map((img, i) => ({ ...img, order: i })));
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i })));
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, index) => (
            <div key={`${img.url}-${index}`} className="rounded-lg border border-border p-2">
              <img src={img.url} alt={img.alt} className="h-24 w-full rounded-md object-cover" />
              <input
                placeholder="Texto alternativo"
                value={img.alt}
                onChange={(e) => updateAlt(index, e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={() => move(index, 1)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold">
          <span className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-2 hover:bg-muted">
            {uploading ? "Subiendo..." : "Subir imagen"}
          </span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => void handleFileUpload(e)} />
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
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}
