import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      navigate("/login?reset=ok", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No pudimos restablecer tu contraseña. Probá de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Link inválido</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Este link no incluye un token de recuperación. Pedí uno nuevo.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link to="/olvide-contrasena" className="font-semibold text-primary">
            Recuperar contraseña
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Elegí tu nueva contraseña</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold">
            Contraseña nueva
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-semibold">
            Repetir contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Guardando..." : "Restablecer contraseña"}
        </Button>
      </form>
    </div>
  );
}
