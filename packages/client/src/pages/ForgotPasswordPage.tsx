import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    } finally {
      // Mostramos el mismo mensaje haya o no una cuenta con ese email: el
      // backend responde igual en ambos casos para no filtrar qué emails
      // están registrados.
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Recuperar contraseña</h1>

      {sent ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Si existe una cuenta con ese email, te mandamos un link para restablecer tu contraseña. Revisá tu
          bandeja de entrada.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresá tu email y te mandamos un link para elegir una nueva contraseña.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Enviando..." : "Mandar link"}
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link to="/login" className="font-semibold text-primary">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
