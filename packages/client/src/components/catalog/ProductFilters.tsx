import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProductSort } from "@/hooks/useProducts";

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Más nuevos" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc", label: "Nombre A-Z" },
];

interface ProductFiltersProps {
  sort: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  onSortChange: (value: ProductSort) => void;
  onPriceChange: (min: number | undefined, max: number | undefined) => void;
}

export function ProductFilters({ sort, minPrice, maxPrice, onSortChange, onPriceChange }: ProductFiltersProps) {
  const [minInput, setMinInput] = useState(minPrice !== undefined ? String(minPrice / 100) : "");
  const [maxInput, setMaxInput] = useState(maxPrice !== undefined ? String(maxPrice / 100) : "");

  function applyPriceFilter() {
    const min = minInput ? Math.round(Number(minInput) * 100) : undefined;
    const max = maxInput ? Math.round(Number(maxInput) * 100) : undefined;
    onPriceChange(min, max);
  }

  return (
    <div className="mt-6 flex flex-wrap items-end gap-6 border-y border-border py-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sort" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ordenar
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ProductSort)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Precio (ARS)</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Mín"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            className="w-24 rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Máx"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            className="w-24 rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={applyPriceFilter}>
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}
