// Relativo a propósito: mantiene el pedido same-origin (proxy de Vite en dev,
// rewrite de Vercel en producción) para que la cookie httpOnly del refresh
// token no caiga en el bloqueo de cookies de terceros de los navegadores.
const API_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiFetchOptions extends RequestInit {
  accessToken?: string;
}

/** Callbacks que registra el AuthProvider para reaccionar a la expiración del access token. */
interface SessionHandlers {
  /** Devuelve el access token nuevo, o null si el refresh token ya no sirve. */
  refresh: () => Promise<string | null>;
  /** Se llama cuando no se pudo renovar: hay que limpiar la sesión local. */
  onExpired: () => void;
}

let sessionHandlers: SessionHandlers | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setSessionHandlers(handlers: SessionHandlers | null): void {
  sessionHandlers = handlers;
}

/** Varios requests pueden recibir 401 a la vez: comparten un único refresh
 * (el refresh token rota en cada uso, un segundo refresh en paralelo fallaría). */
function refreshSession(): Promise<string | null> {
  if (!sessionHandlers) return Promise.resolve(null);
  refreshInFlight ??= sessionHandlers.refresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Wrapper mínimo sobre fetch: manda cookies (para el refresh token httpOnly),
 * agrega el access token como Bearer si se pasa, y normaliza errores de la
 * API a ApiError en vez de dejar pasar respuestas no-ok silenciosamente.
 *
 * Si un request autenticado recibe 401 (access token vencido) renueva la
 * sesión una vez y reintenta; si no se puede, avisa para que la app vuelva al login.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { accessToken, headers, ...rest } = options;

  const doFetch = (token?: string) =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        // Con FormData (subida de archivos) el boundary lo tiene que poner el
        // browser: si forzamos este header acá, el multipart queda sin límite
        // y el server no puede parsearlo.
        ...(rest.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

  let res = await doFetch(accessToken);

  if (res.status === 401 && accessToken && sessionHandlers) {
    const newToken = await refreshSession();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      sessionHandlers.onExpired();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(body.error ?? "Ocurrió un error inesperado", res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
