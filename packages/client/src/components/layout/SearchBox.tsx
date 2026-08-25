import { formatARS } from "@growshop/shared";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { apiFetch } from "@/lib/api";
import { cheapestVariant } from "@/lib/catalog";
import type { ProductListItem } from "@/types/catalog";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 300);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    apiFetch<{ items: ProductListItem[] }>(`/products?q=${encodeURIComponent(debounced)}&limit=5`)
      .then((res) => {
        if (!cancelled) setResults(res.items);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResults() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    navigate(`/buscar?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div ref={containerRef} className="relative hidden max-w-xs flex-1 sm:block">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") goToResults();
          }}
          placeholder="Buscar productos..."
          aria-label="Buscar productos"
          className="w-full rounded-full border border-border bg-card py-2 pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </div>

      {open && debounced.trim() && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados para &quot;{debounced}&quot;</p>
          ) : (
            <>
              <ul>
                {results.map((product) => (
                  <li key={product._id}>
                    <Link
                      to={`/productos/${product.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted"
                    >
                      <span className="flex-1 truncate text-sm font-medium">{product.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatARS(cheapestVariant(product.variants).price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goToResults}
                className="w-full border-t border-border px-4 py-2.5 text-left text-sm font-semibold text-primary hover:bg-muted"
              >
                Ver todos los resultados
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
