import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("PATCH /api/users/me", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).patch("/api/users/me").send({ firstName: "Nuevo" });
    expect(res.status).toBe(401);
  });

  it("actualiza nombre/apellido/teléfono", async () => {
    const { accessToken } = await createUserWithToken();
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ firstName: "Nuevo", lastName: "Apellido", phone: "1122334455" });

    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe("Nuevo");
    expect(res.body.user.lastName).toBe("Apellido");
    expect(res.body.user.phone).toBe("1122334455");
  });
});

describe("libreta de direcciones", () => {
  const validAddress = {
    label: "Casa",
    street: "Calle Falsa 123",
    city: "San Isidro",
    province: "Buenos Aires",
    zipCode: "1642",
  };

  it("agrega una dirección", async () => {
    const { accessToken } = await createUserWithToken();
    const res = await request(app)
      .post("/api/users/me/addresses")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validAddress);

    expect(res.status).toBe(201);
    expect(res.body.user.addresses).toHaveLength(1);
    expect(res.body.user.addresses[0].street).toBe("Calle Falsa 123");
    expect(res.body.user.addresses[0]._id).toBeDefined();
  });

  it("solo una dirección puede ser default a la vez", async () => {
    const { accessToken } = await createUserWithToken();
    await request(app)
      .post("/api/users/me/addresses")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validAddress, isDefault: true });
    const res = await request(app)
      .post("/api/users/me/addresses")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validAddress, label: "Trabajo", isDefault: true });

    const defaults = res.body.user.addresses.filter((a: { isDefault: boolean }) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe("Trabajo");
  });

  it("edita una dirección existente", async () => {
    const { accessToken } = await createUserWithToken();
    const createRes = await request(app)
      .post("/api/users/me/addresses")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validAddress);
    const addressId = createRes.body.user.addresses[0]._id;

    const res = await request(app)
      .patch(`/api/users/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validAddress, city: "Vicente López" });

    expect(res.status).toBe(200);
    expect(res.body.user.addresses[0].city).toBe("Vicente López");
  });

  it("rechaza editar una dirección inexistente", async () => {
    const { accessToken } = await createUserWithToken();
    const res = await request(app)
      .patch("/api/users/me/addresses/656565656565656565656565")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validAddress);
    expect(res.status).toBe(404);
  });

  it("elimina una dirección", async () => {
    const { accessToken } = await createUserWithToken();
    const createRes = await request(app)
      .post("/api/users/me/addresses")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validAddress);
    const addressId = createRes.body.user.addresses[0]._id;

    const res = await request(app)
      .delete(`/api/users/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.addresses).toHaveLength(0);
  });

  it("una dirección de un usuario no es accesible por otro", async () => {
    const { accessToken: ownerToken } = await createUserWithToken();
    const { accessToken: strangerToken } = await createUserWithToken();
    const createRes = await request(app)
      .post("/api/users/me/addresses")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(validAddress);
    const addressId = createRes.body.user.addresses[0]._id;

    const res = await request(app)
      .delete(`/api/users/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(404);
  });
});
