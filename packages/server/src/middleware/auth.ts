import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../models/User.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/jwt.js";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Token no provisto"));
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError("Token inválido o expirado"));
  }
}

/**
 * Igual que `authenticate`, pero nunca rechaza la request: si no hay token o
 * es inválido, simplemente continúa como anónimo. Útil en rutas públicas que
 * exponen contenido extra cuando quien pide es admin (ej. productos inactivos).
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // token inválido o expirado: se ignora, la request sigue como anónima
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
