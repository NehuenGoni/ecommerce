import {
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Menu,
  Package,
  Truck,
  UserCog,
  Warehouse,
  X,
} from "lucide-react";
import { useState } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/categorias", label: "Categorías", icon: FolderTree },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/admin/inventario", label: "Inventario", icon: Warehouse },
  { to: "/admin/compras", label: "Compras", icon: Truck },
  { to: "/admin/administradores", label: "Administradores", icon: UserCog },
];

export function AdminLayout() {
  const { user, initializing, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (initializing) return null;
  if (!user) return <Navigate to="/login?redirect=/admin" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <div className="flex items-center justify-between md:block">
          <div>
            <p className="font-display text-lg font-bold">Panel admin</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
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

        <nav className={cn("mt-4 flex-col gap-1 md:flex", mobileOpen ? "flex" : "hidden")}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:text-destructive"
          >
            Cerrar sesión
          </button>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
