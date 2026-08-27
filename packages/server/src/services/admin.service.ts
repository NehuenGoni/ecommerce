import { env } from "../config/env.js";
import { AdminInvite, type AdminInviteDocument } from "../models/AdminInvite.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User, type UserDocument, type UserHydratedDocument } from "../models/User.js";
import { sendAdminInviteEmail, sendAdminPromotedEmail, sendAdminRevokedEmail } from "./email.service.js";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors.js";
import { generateSecureToken, hashSecureToken } from "../utils/secureToken.js";
import type { AcceptInviteInput } from "../validators/admin.validators.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function getAdminOrThrow(userId: string): Promise<UserHydratedDocument> {
  const user = await User.findById(userId);
  if (!user || user.role !== "admin") {
    throw new NotFoundError("Administrador no encontrado");
  }
  return user;
}

export async function listAdmins(): Promise<UserDocument[]> {
  return User.find({ role: "admin" }).sort({ createdAt: 1 });
}

export async function listPendingInvites(): Promise<AdminInviteDocument[]> {
  return AdminInvite.find({ acceptedAt: { $exists: false } }).sort({ createdAt: -1 });
}

/**
 * Si ya existe una cuenta con ese email, la promueve directo a admin (no
 * tiene sentido pedirle que "acepte" una invitación para algo que ya puede
 * hacer con su login de siempre). Si no existe, manda una invitación para
 * que cree la cuenta.
 */
export async function inviteAdmin(email: string, invitedBy: string): Promise<{ promoted: boolean }> {
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role === "admin") {
      throw new ConflictError("Ese usuario ya es administrador");
    }
    existing.role = "admin";
    await existing.save();
    void sendAdminPromotedEmail(existing.email);
    return { promoted: true };
  }

  const alreadyInvited = await AdminInvite.findOne({ email, acceptedAt: { $exists: false } });
  if (alreadyInvited) {
    throw new ConflictError("Ya hay una invitación pendiente para ese email");
  }

  const rawToken = generateSecureToken();
  await AdminInvite.create({
    email,
    tokenHash: hashSecureToken(rawToken),
    invitedBy,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const acceptUrl = `${env.CLIENT_URL}/aceptar-invitacion?token=${rawToken}`;
  void sendAdminInviteEmail(email, acceptUrl);
  return { promoted: false };
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const invite = await AdminInvite.findById(inviteId);
  if (!invite || invite.acceptedAt) {
    throw new NotFoundError("Invitación no encontrada");
  }
  await invite.deleteOne();
}

export async function acceptInvite(input: AcceptInviteInput): Promise<UserHydratedDocument> {
  const invite = await AdminInvite.findOne({ tokenHash: hashSecureToken(input.token) });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new UnauthorizedError("La invitación es inválida o venció");
  }

  const existing = await User.findOne({ email: invite.email });
  if (existing) {
    throw new ConflictError("Ya existe una cuenta con ese email");
  }

  const user = await User.create({
    email: invite.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    role: "admin",
  });

  invite.acceptedAt = new Date();
  await invite.save();

  return user;
}

export async function revokeAdmin(userId: string, requesterId: string): Promise<UserDocument> {
  if (userId === requesterId) {
    throw new BadRequestError("No podés revocarte tu propio acceso");
  }

  const user = await getAdminOrThrow(userId);
  if (!user.isActive) {
    return user;
  }

  const activeAdmins = await User.countDocuments({ role: "admin", isActive: true });
  if (activeAdmins <= 1) {
    throw new ConflictError("No podés revocar al único administrador activo");
  }

  user.isActive = false;
  await user.save();

  await RefreshToken.updateMany(
    { user: user._id, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );
  void sendAdminRevokedEmail(user.email);

  return user;
}

export async function reactivateAdmin(userId: string): Promise<UserDocument> {
  const user = await getAdminOrThrow(userId);
  user.isActive = true;
  await user.save();
  return user;
}
