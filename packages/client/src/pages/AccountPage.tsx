import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// Cuenta mínima: solo identidad + logout. El módulo completo ("cuenta del
// cliente": direcciones, historial de pedidos) es el próximo paso.
export function AccountPage() {
  const { user, initializing, logout } = useAuth();

  if (initializing) return null;

  if (!user) {
    return <Navigate to="/login?redirect=/cuenta" replace />;
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Hola, {user.firstName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <div className="mt-8 flex flex-col gap-2">
        <Button asChild variant="outline">
          <Link to="/carrito">Ver mi carrito</Link>
        </Button>
        <Button variant="ghost" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
