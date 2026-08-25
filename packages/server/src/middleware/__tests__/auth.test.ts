import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { signAccessToken } from "../../utils/jwt.js";
import { authenticate, requireRole } from "../auth.js";

function mockReqRes(headers: Record<string, string> = {}) {
  const req = { headers, user: undefined } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("authenticate", () => {
  it("adjunta req.user cuando el token es válido", () => {
    const token = signAccessToken({ sub: "user-1", role: "customer" });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });

    authenticate(req, res, next);

    expect(req.user).toEqual({ id: "user-1", role: "customer" });
    expect(next).toHaveBeenCalledWith();
  });

  it("llama a next con error si no hay header authorization", () => {
    const { req, res, next } = mockReqRes();

    authenticate(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("llama a next con error si el token es inválido", () => {
    const { req, res, next } = mockReqRes({ authorization: "Bearer token-invalido" });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe("requireRole", () => {
  it("permite el paso si el rol del usuario está autorizado", () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: "user-1", role: "admin" };

    requireRole("admin", "customer")(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rechaza con 403 si el rol no está autorizado", () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: "user-1", role: "customer" };

    requireRole("admin")(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("rechaza con 401 si no hay usuario autenticado", () => {
    const { req, res, next } = mockReqRes();

    requireRole("admin")(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
