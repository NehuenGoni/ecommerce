import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { HydratedDocument } from "mongoose";
import { env } from "../config/env.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User, type UserDocument } from "../models/User.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./email.service.js";
import { ConflictError, UnauthorizedError } from "../utils/errors.js";
import {
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import type { LoginInput, RegisterInput } from "../validators/auth.validators.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
  void sendWelcomeEmail(user.email, user.firstName);
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

/**
 * No revela si el email existe: responde igual (sin error) tanto si hay
 * cuenta como si no, para no filtrar qué emails están registrados.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) return;

  const rawToken = randomBytes(32).toString("hex");
  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashResetToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  });

  const resetUrl = `${env.CLIENT_URL}/restablecer-contrasena?token=${rawToken}`;
  void sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const resetToken = await PasswordResetToken.findOne({ tokenHash: hashResetToken(token) });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new UnauthorizedError("El link de recuperación es inválido o venció");
  }

  const user = await User.findById(resetToken.user);
  if (!user) {
    throw new UnauthorizedError("El link de recuperación es inválido o venció");
  }

  user.password = newPassword;
  await user.save();

  resetToken.usedAt = new Date();
  await resetToken.save();

  // Un reset de contraseña es un evento de seguridad: cerramos todas las sesiones activas.
  await RefreshToken.updateMany(
    { user: user._id, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );
}
