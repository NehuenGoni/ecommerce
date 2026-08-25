import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export interface RefreshTokenDocument {
  user: Types.ObjectId;
  jti: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index: Mongo elimina el documento automáticamente al pasar expiresAt.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenHydratedDocument = HydratedDocument<RefreshTokenDocument>;

export const RefreshToken = mongoose.model<RefreshTokenDocument>(
  "RefreshToken",
  refreshTokenSchema,
);
