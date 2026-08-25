const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

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

/**
 * Wrapper mínimo sobre fetch: manda cookies (para el refresh token httpOnly),
 * agrega el access token como Bearer si se pasa, y normaliza errores de la
 * API a ApiError en vez de dejar pasar respuestas no-ok silenciosamente.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { accessToken, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(body.error ?? "Ocurrió un error inesperado", res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
