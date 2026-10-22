import mongoose, { Schema } from "mongoose";

export interface StoreSettingsDocument {
  /** Singleton: siempre "default". El índice único garantiza un único documento. */
  key: string;
  pricing: {
    marginPercent: number;
    roundingStep: number;
    autoPriceOnPurchase: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const storeSettingsSchema = new Schema<StoreSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    pricing: {
      marginPercent: { type: Number, required: true, min: 0 },
      roundingStep: { type: Number, required: true, min: 1 },
      autoPriceOnPurchase: { type: Boolean, required: true },
    },
  },
  { timestamps: true },
);

export const StoreSettings = mongoose.model<StoreSettingsDocument>("StoreSettings", storeSettingsSchema);
