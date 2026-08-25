import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import * as authService from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, UnauthorizedError } from "../utils/errors.js";
import { REFRESH_TOKEN_TTL_MS } from "../utils/jwt.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/auth";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.registerUser(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ user, accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
  setRefreshCookie(res, refreshToken);
  res.json({ user, accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
  if (!token) {
    throw new UnauthorizedError("No hay refresh token");
  }

  const { user, accessToken, refreshToken } = await authService.rotateRefreshToken(token);
  setRefreshCookie(res, refreshToken);
  res.json({ user, accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
  if (token) {
    await authService.revokeRefreshToken(token);
  }
  clearRefreshCookie(res);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    throw new NotFoundError("Usuario no encontrado");
  }
  res.json({ user });
});
