import type { Express } from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/email.service.js", () => ({
  sendWelcomeEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(),
  sendOrderStatusChangeEmail: vi.fn(),
  sendAdminInviteEmail: vi.fn(),
  sendAdminPromotedEmail: vi.fn(),
  sendAdminRevokedEmail: vi.fn(),
}));

import { createApp } from "../../app.js";
import { AdminInvite } from "../../models/AdminInvite.js";
import { RefreshToken } from "../../models/RefreshToken.js";
import { User } from "../../models/User.js";
import * as emailService from "../../services/email.service.js";
import { createAdminWithToken, createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

let app: Express;

beforeAll(connectTestDB);
beforeEach(() => {
  app = createApp("http://localhost:5173");
  vi.clearAllMocks();
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

function getInvitedToken(): string {
  const call = vi.mocked(emailService.sendAdminInviteEmail).mock.calls[0];
  const acceptUrl = call?.[1] ?? "";
  return new URL(acceptUrl).searchParams.get("token") ?? "";
}

describe("POST /api/admin/invites", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).post("/api/admin/invites").send({ email: "nuevo@example.com" });
    expect(res.status).toBe(401);
  });

  it("rechaza si no es admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const res = await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "nuevo@example.com" });
    expect(res.status).toBe(403);
  });

  it("crea una invitación para un email sin cuenta y manda el email", async () => {
    const { accessToken } = await createAdminWithToken();
    const res = await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "nuevo-admin@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.promoted).toBe(false);
    expect(emailService.sendAdminInviteEmail).toHaveBeenCalledTimes(1);

    const invite = await AdminInvite.findOne({ email: "nuevo-admin@example.com" });
    expect(invite).not.toBeNull();
  });

  it("promueve directo si ya existe una cuenta customer con ese email", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");

    const res = await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: customer.email });

    expect(res.status).toBe(201);
    expect(res.body.promoted).toBe(true);
    expect(emailService.sendAdminPromotedEmail).toHaveBeenCalledWith(customer.email);

    const updated = await User.findById(customer._id);
    expect(updated?.role).toBe("admin");
  });

  it("rechaza invitar a alguien que ya es admin", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: otherAdmin } = await createAdminWithToken();

    const res = await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: otherAdmin.email });

    expect(res.status).toBe(409);
  });

  it("rechaza una invitación duplicada para el mismo email pendiente", async () => {
    const { accessToken } = await createAdminWithToken();
    await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "duplicado@example.com" });

    const res = await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "duplicado@example.com" });

    expect(res.status).toBe(409);
  });
});

describe("GET /api/admin/invites y DELETE /api/admin/invites/:id", () => {
  it("lista las invitaciones pendientes y permite cancelarlas", async () => {
    const { accessToken } = await createAdminWithToken();
    await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "pendiente@example.com" });

    const listRes = await request(app)
      .get("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(listRes.body.invites).toHaveLength(1);
    const inviteId = listRes.body.invites[0]._id;

    const cancelRes = await request(app)
      .delete(`/api/admin/invites/${inviteId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(cancelRes.status).toBe(204);

    const listAfter = await request(app)
      .get("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(listAfter.body.invites).toHaveLength(0);
  });

  it("responde 404 al cancelar una invitación inexistente", async () => {
    const { accessToken } = await createAdminWithToken();
    const res = await request(app)
      .delete("/api/admin/invites/000000000000000000000000")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/admins", () => {
  it("lista todos los admins", async () => {
    const { accessToken } = await createAdminWithToken();
    await createAdminWithToken();

    const res = await request(app).get("/api/admin/admins").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.admins).toHaveLength(2);
  });
});

describe("PATCH /api/admin/admins/:id/revoke", () => {
  it("revoca a otro admin, le corta las sesiones activas y le avisa por email", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: target } = await createAdminWithToken();
    await RefreshToken.create({ user: target._id, jti: "jti-target", expiresAt: new Date(Date.now() + 1000000) });

    const res = await request(app)
      .patch(`/api/admin/admins/${target._id}/revoke`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.admin.isActive).toBe(false);
    expect(emailService.sendAdminRevokedEmail).toHaveBeenCalledWith(target.email);

    const revokedTokens = await RefreshToken.find({ user: target._id });
    expect(revokedTokens.every((t) => t.revokedAt)).toBe(true);

    // el admin revocado ya no puede loguearse
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: target.email, password: "supersecret" });
    expect(loginRes.status).toBe(401);
  });

  it("rechaza revocarse a sí mismo", async () => {
    const { accessToken, user } = await createAdminWithToken();
    const res = await request(app)
      .patch(`/api/admin/admins/${user._id}/revoke`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();
    expect(res.status).toBe(400);
  });

  it("rechaza revocar al único admin activo", async () => {
    const { accessToken, user } = await createAdminWithToken();
    const { user: target } = await createAdminWithToken();
    // desactiva a todos menos "target", dejándolo como el único admin activo
    await User.updateOne({ _id: user._id }, { isActive: false });

    const res = await request(app)
      .patch(`/api/admin/admins/${target._id}/revoke`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(res.status).toBe(409);
  });

  it("rechaza si no es admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const { user: target } = await createAdminWithToken();
    const res = await request(app)
      .patch(`/api/admin/admins/${target._id}/revoke`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/admins/:id/reactivate", () => {
  it("reactiva a un admin revocado", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: target } = await createAdminWithToken();
    await User.updateOne({ _id: target._id }, { isActive: false });

    const res = await request(app)
      .patch(`/api/admin/admins/${target._id}/reactivate`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.admin.isActive).toBe(true);
  });
});

describe("POST /api/auth/accept-invite", () => {
  it("crea la cuenta admin, inicia sesión y consume la invitación", async () => {
    const { accessToken } = await createAdminWithToken();
    await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "invitado@example.com" });

    const token = getInvitedToken();
    expect(token).not.toBe("");

    const res = await request(app).post("/api/auth/accept-invite").send({
      token,
      firstName: "Nueva",
      lastName: "Admin",
      password: "supersecret123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.headers["set-cookie"]?.[0]).toContain("refreshToken=");

    // el token ya consumido no se puede reusar
    const secondRes = await request(app).post("/api/auth/accept-invite").send({
      token,
      firstName: "Otra",
      lastName: "Persona",
      password: "supersecret123",
    });
    expect(secondRes.status).toBe(401);
  });

  it("rechaza un token inválido", async () => {
    const res = await request(app).post("/api/auth/accept-invite").send({
      token: "token-inventado",
      firstName: "Nueva",
      lastName: "Admin",
      password: "supersecret123",
    });
    expect(res.status).toBe(401);
  });
});
