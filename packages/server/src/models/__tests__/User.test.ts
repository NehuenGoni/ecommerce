import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { User } from "../User.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("User model", () => {
  it("hashea la contraseña al guardar", async () => {
    const user = await User.create({
      email: "test@example.com",
      password: "supersecret",
      firstName: "Juan",
      lastName: "Pérez",
    });

    expect(user.password).not.toBe("supersecret");
    expect(user.password.length).toBeGreaterThan(20);
  });

  it("comparePassword valida la contraseña correcta e invalida una incorrecta", async () => {
    await User.create({
      email: "test2@example.com",
      password: "supersecret",
      firstName: "Juan",
      lastName: "Pérez",
    });

    const user = await User.findOne({ email: "test2@example.com" }).select("+password");
    expect(user).not.toBeNull();
    await expect(user!.comparePassword("supersecret")).resolves.toBe(true);
    await expect(user!.comparePassword("wrongpassword")).resolves.toBe(false);
  });

  it("no re-hashea la contraseña si no fue modificada", async () => {
    const user = await User.create({
      email: "test3@example.com",
      password: "supersecret",
      firstName: "Juan",
      lastName: "Pérez",
    });
    const hashBefore = user.password;

    user.firstName = "Juan Carlos";
    await user.save();

    expect(user.password).toBe(hashBefore);
  });

  it("no incluye password por defecto en las queries", async () => {
    await User.create({
      email: "test4@example.com",
      password: "supersecret",
      firstName: "Juan",
      lastName: "Pérez",
    });

    const user = await User.findOne({ email: "test4@example.com" });
    expect(user!.password).toBeUndefined();
  });

  it("rechaza emails duplicados", async () => {
    await User.create({
      email: "dup@example.com",
      password: "supersecret",
      firstName: "Juan",
      lastName: "Pérez",
    });

    await expect(
      User.create({
        email: "dup@example.com",
        password: "otherpassword",
        firstName: "Otro",
        lastName: "Usuario",
      }),
    ).rejects.toThrow();
  });
});
