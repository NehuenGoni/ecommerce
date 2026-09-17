import type { Category } from "@growshop/shared";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const CLOSE_DELAY_MS = 150;

export function CategoriesMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  if (categories.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={cn(
          "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-muted",
          open && "bg-muted",
        )}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Categorías
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          "absolute left-0 top-full z-50 pt-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <div className="min-w-48 rounded-2xl border border-border bg-card p-1.5 shadow-lg">
          {categories.map((category) => (
            <NavLink
              key={category._id}
              to={`/categoria/${category.slug}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "block rounded-xl px-3.5 py-2.5 text-sm font-semibold text-card-foreground transition-colors hover:bg-muted",
                  isActive && "bg-muted",
                )
              }
            >
              {category.name}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
