import { Product } from "../models/Product.js";
import { StockMovement } from "../models/StockMovement.js";
import { ConflictError } from "../utils/errors.js";

export interface StockDecrementItem {
  productId: string;
  sku: string;
  quantity: number;
}

/**
 * Descuenta stock para una venta y registra el StockMovement correspondiente.
 * Cada descuento es una actualización atómica condicionada al stock
 * disponible (findOneAndUpdate con $gte), así que no hay sobreventa por
 * condición de carrera entre dos checkouts concurrentes. Si un item falla a
 * mitad de camino, se revierte lo ya descontado: no usamos una transacción
 * multi-documento porque un Mongo standalone (y mongodb-memory-server por
 * default) no las soporta sin un replica set.
 */
export async function decrementStock(
  items: StockDecrementItem[],
  reference: string,
  createdBy: string,
): Promise<void> {
  const applied: StockDecrementItem[] = [];

  try {
    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, "variants.sku": item.sku, "variants.stock": { $gte: item.quantity } },
        { $inc: { "variants.$.stock": -item.quantity } },
        { new: true },
      );

      if (!updated) {
        throw new ConflictError(`Stock insuficiente para el SKU ${item.sku}`);
      }
      applied.push(item);

      const variant = updated.variants.find((v) => v.sku === item.sku)!;
      await StockMovement.create({
        product: item.productId,
        variantSku: item.sku,
        type: "sale_out",
        quantity: -item.quantity,
        previousStock: variant.stock + item.quantity,
        newStock: variant.stock,
        reference,
        createdBy,
      });
    }
  } catch (err) {
    await Promise.all(applied.map((item) => restoreStock(item)));
    throw err;
  }
}

async function restoreStock(item: StockDecrementItem): Promise<void> {
  await Product.updateOne(
    { _id: item.productId, "variants.sku": item.sku },
    { $inc: { "variants.$.stock": item.quantity } },
  );
}
