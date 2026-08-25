import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createAdminWithToken, createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("POST /api/uploads/cloudinary-signature", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).post("/api/uploads/cloudinary-signature");
    expect(res.status).toBe(401);
  });

  it("rechaza si el usuario no es admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const res = await request(app)
      .post("/api/uploads/cloudinary-signature")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("devuelve firma, timestamp y credenciales públicas para un admin", async () => {
    const { accessToken } = await createAdminWithToken();
    const res = await request(app)
      .post("/api/uploads/cloudinary-signature")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.signature).toEqual(expect.any(String));
    expect(res.body.timestamp).toEqual(expect.any(Number));
    expect(res.body.folder).toBe("growshop/products");
    expect(res.body).not.toHaveProperty("apiSecret");
  });
});
