import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/cuenta/pedidos", label: "Mis pedidos" },
  { to: "/cuenta/direcciones", label: "Mis direcciones" },
  { to: "/cuenta/datos", label: "Mis datos" },
];

export function AccountLayout() {
  const { user, initializing, logout } = useAuth();

  if (initializing) return null;
  if (!user) return <Navigate to="/login?redirect=/cuenta/pedidos" replace />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Hola, {user.firstName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <div className="mt-6 flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => void logout()}
          className="ml-auto px-3.5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-destructive"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="py-8">
        <Outlet />
      </div>
    </div>
  );
}
