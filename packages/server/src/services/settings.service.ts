import type { PricingSettings } from "@growshop/shared";
import { env } from "../config/env.js";
import { StoreSettings } from "../models/StoreSettings.js";
import type { UpdatePricingSettingsInput } from "../validators/settings.validators.js";

/** Valores iniciales: lo que dice el .env hasta que el admin guarda su propia configuración. */
function envPricingDefaults(): PricingSettings {
  return {
    marginPercent: env.DEFAULT_MARGIN_PCT,
    roundingStep: env.PRICE_ROUNDING_STEP,
    autoPriceOnPurchase: true,
  };
}

/** Configuración de precios vigente: la guardada por el admin o, si no hay, la del .env. */
export async function getPricingSettings(): Promise<PricingSettings> {
  const doc = await StoreSettings.findOne({ key: "default" }).lean();
  if (!doc) return envPricingDefaults();
  const { marginPercent, roundingStep, autoPriceOnPurchase } = doc.pricing;
  return { marginPercent, roundingStep, autoPriceOnPurchase };
}

export async function updatePricingSettings(input: UpdatePricingSettingsInput): Promise<PricingSettings> {
  await StoreSettings.findOneAndUpdate(
    { key: "default" },
    { $set: { pricing: input } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return getPricingSettings();
}
