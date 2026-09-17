import { Product } from "../models/Product.js";

export interface VariantPricingUpdate {
  productId: string;
  sku: string;
  /** Centavos. Un campo omitido no se toca -- permite actualizar solo el costo, o solo el precio, o ambos. */
  costPrice?: number;
  price?: number;
}

/**
 * Única función que escribe `costPrice`/`price` de una variante -- espejo
 * conceptual de `applyStockDelta` (inventory.service.ts): un solo lugar
 * escribe cada dato sensible del catálogo. Eso deja la puerta abierta a un
 * futuro historial de cambios de precio (modelo `PriceChange`, v3) sin
 * tocar a los callers.
 *
 * `reference` (el id de la importación que originó el cambio) todavía no
 * se persiste en ningún lado -- no existe el equivalente a StockMovement
 * para precios -- pero se recibe desde ya para no tener que romper esta
 * firma cuando ese modelo exista.
 *
 * Devuelve false si el producto/SKU no existe, sin tirar error: el caller
 * (invoiceImport.service.ts) decide si eso es un fallo real.
 */
export async function applyVariantPricing(update: VariantPricingUpdate, reference: string): Promise<boolean> {
  const set: Record<string, number> = {};
  if (update.costPrice !== undefined) set["variants.$.costPrice"] = update.costPrice;
  if (update.price !== undefined) set["variants.$.price"] = update.price;

  if (Object.keys(set).length === 0) return true;

  const updated = await Product.findOneAndUpdate(
    { _id: update.productId, "variants.sku": update.sku },
    { $set: set },
  );
  return updated !== null;
}
