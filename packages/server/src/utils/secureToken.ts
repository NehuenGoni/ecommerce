import { createHash, randomBytes } from "node:crypto";

/** Genera un token de un solo uso para links por email (reset de contraseña, invitaciones). */
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

/** Nunca guardamos el token crudo: solo su hash, para poder buscarlo sin poder reconstruirlo. */
export function hashSecureToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
