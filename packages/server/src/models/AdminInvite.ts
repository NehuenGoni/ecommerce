import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export interface AdminInviteDocument {
  email: string;
  /** Hash sha256 del token crudo (el que se manda por email); nunca guardamos el token en texto plano. */
  tokenHash: string;
  invitedBy: Types.ObjectId;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

const adminInviteSchema = new Schema<AdminInviteDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index: Mongo elimina la invitación automáticamente al pasar expiresAt,
// aceptada o no.
adminInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AdminInviteHydratedDocument = HydratedDocument<AdminInviteDocument>;

export const AdminInvite = mongoose.model<AdminInviteDocument>("AdminInvite", adminInviteSchema);
