import type { Express } from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { User } from "../../models/User.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

// Se recrea en cada test: el rate limiter de /api/auth guarda estado en memoria
// por instancia de app, y no queremos que un test agote el límite de otro.
let app: Express;

beforeAll(connectTestDB);
beforeEach(() => {
  app = createApp("http://localhost:5173");
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const validRegisterPayload = {
  email: "cliente@example.com",
  password: "supersecret",
  firstName: "Ana",
  lastName: "García",
};

describe("POST /api/auth/register", () => {
  it("crea un usuario customer y devuelve accessToken + cookie de refresh", async () => {
    const res = await request(app).post("/api/auth/register").send(validRegisterPayload);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(validRegisterPayload.email);
    expect(res.body.user.role).toBe("customer");
    expect(res.body.user.password).toBeUndefined();

    const setCookie = res.headers["set-cookie"];
    expect(setCookie?.[0]).toContain("refreshToken=");
    expect(setCookie?.[0]).toContain("HttpOnly");
  });

  it("rechaza un registro con email duplicado", async () => {
    await request(app).post("/api/auth/register").send(validRegisterPayload);
    const res = await request(app).post("/api/auth/register").send(validRegisterPayload);

    expect(res.status).toBe(409);
  });

  it("rechaza una contraseña demasiado corta", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegisterPayload, password: "123" });

    expect(res.status).toBe(400);
  });

  it("ignora un role provisto en el body y siempre crea customer", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegisterPayload, role: "admin" });

    expect(res.body.user.role).toBe("customer");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await User.create({ ...validRegisterPayload });
  });

  it("devuelve accessToken con credenciales correctas", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validRegisterPayload.email, password: validRegisterPayload.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it("rechaza contraseña incorrecta con 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validRegisterPayload.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("rechaza email inexistente con 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "noexiste@example.com", password: "whatever123" });

    expect(res.status).toBe(401);
  });

  it("rechaza login de usuario desactivado", async () => {
    await User.create({
      email: "inactivo@example.com",
      password: "supersecret",
      firstName: "Inactivo",
      lastName: "User",
      isActive: false,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "inactivo@example.com", password: "supersecret" });

    expect(res.status).toBe(401);
  });
});

describe("flujo completo: login -> refresh -> logout", () => {
  it("rota el refresh token y revoca sesión en logout", async () => {
    const agent = request.agent(app);
    await User.create({ ...validRegisterPayload });

    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: validRegisterPayload.email, password: validRegisterPayload.password });
    expect(loginRes.status).toBe(200);
    const firstRefreshCookie = loginRes.headers["set-cookie"]?.[0] as string;

    const refreshRes = await agent.post("/api/auth/refresh").send();
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));
    // el refresh token rota: la nueva cookie de sesión debe ser distinta de la anterior
    const secondRefreshCookie = refreshRes.headers["set-cookie"]?.[0] as string;
    expect(secondRefreshCookie).not.toBe(firstRefreshCookie);

    const meRes = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${refreshRes.body.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(validRegisterPayload.email);

    const logoutRes = await agent.post("/api/auth/logout").send();
    expect(logoutRes.status).toBe(204);

    // el refresh token ya revocado por logout no debe poder reusarse
    const reusedRefreshRes = await agent.post("/api/auth/refresh").send();
    expect(reusedRefreshRes.status).toBe(401);
  });

  it("rechaza reusar un refresh token ya rotado", async () => {
    const agent = request.agent(app);
    await User.create({ ...validRegisterPayload });

    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: validRegisterPayload.email, password: validRegisterPayload.password });
    const originalCookie = loginRes.headers["set-cookie"]?.[0] as string;

    await agent.post("/api/auth/refresh").send();

    // reintenta con la cookie original (ya rotada/revocada)
    const staleRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", originalCookie)
      .send();
    expect(staleRes.status).toBe(401);
  });

  it("responde 401 si no hay cookie de refresh", async () => {
    const res = await request(app).post("/api/auth/refresh").send();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("responde 401 con token inválido", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer invalido");
    expect(res.status).toBe(401);
  });
});
