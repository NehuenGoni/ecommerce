import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export function ProfilePage() {
  const { user, accessToken, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!user || !accessToken) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ user: AuthUser }>("/users/me", {
        method: "PATCH",
        accessToken: accessToken ?? undefined,
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      updateUser(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar los cambios.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          value={user.email}
          disabled
          className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="firstName" className="text-sm font-semibold">
            Nombre
          </label>
          <input
            id="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lastName" className="text-sm font-semibold">
            Apellido
          </label>
          <input
            id="lastName"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-semibold">
          Teléfono
        </label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      {saved && <p className="text-sm font-semibold text-success">Guardado.</p>}

      <Button type="submit" disabled={submitting} className="w-fit">
        {submitting ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
