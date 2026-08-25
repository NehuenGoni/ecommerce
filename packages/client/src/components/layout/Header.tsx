import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Growshop, ir al inicio">
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
        <path
          d="M20 36C20 36 8 30 8 18C8 10.268 13.268 5 20 5C26.732 5 32 10.268 32 18C32 30 20 36 20 36Z"
          className="fill-primary"
        />
        <path d="M20 32V12" className="stroke-primary-foreground" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M20 20C20 20 24 18.5 24 14.5"
          className="stroke-primary-foreground"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M20 25C20 25 15.5 23 15.5 18"
          className="stroke-primary-foreground"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">Growshop</span>
    </Link>
  );
}

export function Header() {
  const { categories } = useCategories();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <nav className="hidden md:flex items-center gap-1">
          {categories.map((category) => (
            <NavLink
              key={category._id}
              to={`/categoria/${category.slug}`}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-muted",
                  isActive && "bg-muted",
                )
              }
            >
              {category.name}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild aria-label="Mi cuenta">
            <Link to="/cuenta">
              <User />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Carrito de compras">
            <Link to="/carrito" className="relative">
              <ShoppingBag />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-border px-4 py-3 flex flex-col gap-1">
          {categories.map((category) => (
            <NavLink
              key={category._id}
              to={`/categoria/${category.slug}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted",
                  isActive && "bg-muted",
                )
              }
            >
              {category.name}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
