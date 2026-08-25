import { describe, expect, it } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../jwt.js";

describe("access tokens", () => {
  it("firma y verifica un token válido, recuperando el payload original", () => {
    const token = signAccessToken({ sub: "user-1", role: "admin" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.role).toBe("admin");
  });

  it("rechaza un token malformado", () => {
    expect(() => verifyAccessToken("not-a-real-token")).toThrow();
  });

  it("rechaza un token firmado con otra clave", () => {
    // simula un token de refresh (firmado con otra clave) usado como access token
    const refreshToken = signRefreshToken({ sub: "user-1", jti: "abc" });
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});

describe("refresh tokens", () => {
  it("firma y verifica un token válido, recuperando sub y jti", () => {
    const token = signRefreshToken({ sub: "user-1", jti: "some-jti" });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.jti).toBe("some-jti");
  });

  it("rechaza un access token usado como refresh token", () => {
    const accessToken = signAccessToken({ sub: "user-1", role: "customer" });
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
