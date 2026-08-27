import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types/auth";
import type { AdminInvite } from "@/types/adminInvite";

export function AdminsPage() {
  const { user: currentUser, accessToken } = useAuth();
  const [admins, setAdmins] = useState<AuthUser[] | null>(null);
  const [invites, setInvites] = useState<AdminInvite[] | null>(null);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function refresh() {
    if (!accessToken) return;
    apiFetch<{ admins: AuthUser[] }>("/admin/admins", { accessToken }).then((res) => setAdmins(res.admins));
    apiFetch<{ invites: AdminInvite[] }>("/admin/invites", { accessToken }).then((res) =>
      setInvites(res.invites),
    );
  }

  useEffect(refresh, [accessToken]);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setInviting(true);
    try {
      const res = await apiFetch<{ promoted: boolean }>("/admin/invites", {
        method: "POST",
        accessToken: accessToken ?? undefined,
        body: JSON.stringify({ email }),
      });
      setNotice(
        res.promoted
          ? "Esa cuenta ya existía: la promovimos a administrador directamente."
          : "Invitación enviada. Va a poder crear su cuenta desde el link que le llegó por email.",
      );
      setEmail("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos invitar a ese email.");
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvite(id: string) {
    if (!accessToken) return;
    await apiFetch(`/admin/invites/${id}`, { method: "DELETE", accessToken });
    refresh();
  }

  async function handleRevoke(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiFetch(`/admin/admins/${id}/revoke`, { method: "PATCH", accessToken });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos revocar el acceso.");
    }
  }

  async function handleReactivate(id: string) {
    if (!accessToken) return;
    await apiFetch(`/admin/admins/${id}/reactivate`, { method: "PATCH", accessToken });
    refresh();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Administradores</h1>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Invitar administrador</h2>
        <form onSubmit={handleInvite} className="mt-3 flex flex-wrap gap-2">
          <input
            required
            type="email"
            placeholder="email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-[14rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={inviting}>
            {inviting ? "Invitando..." : "Invitar"}
          </Button>
        </form>
        {notice && <p className="mt-2 text-sm font-semibold text-success">{notice}</p>}
        {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-bold">Invitaciones pendientes</h2>
        {!invites ? (
          <Skeleton className="mt-3 h-14 w-full" />
        ) : invites.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {invites.map((invite) => (
              <div
                key={invite._id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span className="text-sm">{invite.email}</span>
                <Button size="sm" variant="ghost" onClick={() => void handleCancelInvite(invite._id)}>
                  Cancelar
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-bold">Administradores actuales</h2>
        {!admins ? (
          <Skeleton className="mt-3 h-14 w-full" />
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Nombre</th>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin._id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">
                      {admin.firstName} {admin.lastName}
                      {admin._id === currentUser?._id && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(vos)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{admin.email}</td>
                    <td className="px-4 py-2.5">
                      {admin.isActive ? (
                        <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          Revocado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {admin._id === currentUser?._id ? null : admin.isActive ? (
                        <button
                          type="button"
                          onClick={() => void handleRevoke(admin._id)}
                          className="font-semibold text-muted-foreground hover:text-destructive"
                        >
                          Revocar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleReactivate(admin._id)}
                          className="font-semibold text-primary hover:underline"
                        >
                          Reactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
