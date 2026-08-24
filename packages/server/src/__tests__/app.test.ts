import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("GET /api/health", () => {
  it("responde 200 con status ok", async () => {
    const app = createApp("http://localhost:5173");
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("responde 404 para rutas desconocidas", async () => {
    const app = createApp("http://localhost:5173");
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
  });
});
