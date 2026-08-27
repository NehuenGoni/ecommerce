import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export interface PasswordResetTokenDocument {
  user: Types.ObjectId;
  /** Hash sha256 del token crudo (el que se manda por email); nunca guardamos el token en texto plano. */
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetTokenDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index: Mongo elimina el documento automáticamente al pasar expiresAt.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenHydratedDocument = HydratedDocument<PasswordResetTokenDocument>;

export const PasswordResetToken = mongoose.model<PasswordResetTokenDocument>(
  "PasswordResetToken",
  passwordResetTokenSchema,
);
