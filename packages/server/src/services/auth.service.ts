import { randomUUID } from "node:crypto";
import type { HydratedDocument } from "mongoose";
import { RefreshToken } from "../models/RefreshToken.js";
import { User, type UserDocument } from "../models/User.js";
import { ConflictError, UnauthorizedError } from "../utils/errors.js";
import {
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import type { LoginInput, RegisterInput } from "../validators/auth.validators.js";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends TokenPair {
  user: HydratedDocument<UserDocument>;
}

async function issueTokenPair(user: HydratedDocument<UserDocument>): Promise<TokenPair> {
  const userId = user._id.toString();
  const accessToken = signAccessToken({ sub: userId, role: user.role });

  const jti = randomUUID();
  await RefreshToken.create({
    user: user._id,
    jti,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  const refreshToken = signRefreshToken({ sub: userId, jti });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new ConflictError("Ya existe una cuenta con ese email");
  }

  const user = await User.create({
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: "customer",
  });

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select("+password");
  if (!user) {
    throw new UnauthorizedError("Credenciales inválidas");
  }
  if (!user.isActive) {
    throw new UnauthorizedError("Cuenta desactivada");
  }

  const valid = await user.comparePassword(input.password);
  if (!valid) {
    throw new UnauthorizedError("Credenciales inválidas");
  }

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

export async function rotateRefreshToken(token: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError("Refresh token inválido");
  }

  const stored = await RefreshToken.findOne({ jti: payload.jti });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token inválido o revocado");
  }

  const user = await User.findById(stored.user);
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Usuario no encontrado o inactivo");
  }

  stored.revokedAt = new Date();
  await stored.save();

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(token);
    await RefreshToken.updateOne({ jti: payload.jti, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  } catch {
    // Token inválido, malformado o ya expirado: no hay nada que revocar.
  }
}
