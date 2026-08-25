import type { FilterQuery, PipelineStage } from "mongoose";
import { Product } from "../models/Product.js";
import { StockMovement, type StockMovementDocument, type StockMovementType } from "../models/StockMovement.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import type { PaginatedResult } from "../utils/pagination.js";
import type { MovementQuery, StockQuery } from "../validators/inventory.validators.js";

export interface StockDecrementItem {
  productId: string;
  sku: string;
  quantity: number;
}

/**
 * Aplica un delta de stock (positivo o negativo) a una variante puntual y
 * deja registrado el StockMovement. Devuelve false si el producto/SKU no
 * existe (o, para deltas negativos, si no hay stock suficiente), sin tirar
 * error: cada caller decide si eso es un fallo real o algo para ignorar.
 */
async function applyStockDelta(
  productId: string,
  sku: string,
  delta: number,
  type: StockMovementType,
  reference: string,
  createdBy: string,
): Promise<boolean> {
  const filter: Record<string, unknown> = { _id: productId, "variants.sku": sku };
  if (delta < 0) {
    filter["variants.stock"] = { $gte: -delta };
  }

  const updated = await Product.findOneAndUpdate(
    filter,
    { $inc: { "variants.$.stock": delta } },
    { new: true },
  );
  if (!updated) return false;

  const variant = updated.variants.find((v) => v.sku === sku)!;
  await StockMovement.create({
    product: productId,
    variantSku: sku,
    type,
    quantity: delta,
    previousStock: variant.stock - delta,
    newStock: variant.stock,
    reference,
    createdBy,
  });
  return true;
}

/**
 * Descuenta stock para una venta. Cada descuento es una actualización
 * atómica condicionada al stock disponible, así que no hay sobreventa por
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
      const ok = await applyStockDelta(
        item.productId,
        item.sku,
        -item.quantity,
        "sale_out",
        reference,
        createdBy,
      );
      if (!ok) {
        throw new ConflictError(`Stock insuficiente para el SKU ${item.sku}`);
      }
      applied.push(item);
    }
  } catch (err) {
    await Promise.all(
      applied.map((item) =>
        Product.updateOne(
          { _id: item.productId, "variants.sku": item.sku },
          { $inc: { "variants.$.stock": item.quantity } },
        ),
      ),
    );
    throw err;
  }
}

/**
 * Devuelve stock al catálogo (ej. cancelación de un pedido ya confirmado) y
 * deja registrado el movimiento como "return". A diferencia de la reversión
 * interna de decrementStock, esta sí genera StockMovement: es un evento de
 * negocio real, no una compensación técnica de una operación fallida. Si el
 * producto ya no existe se ignora en silencio (puede pasar con pedidos
 * viejos), a diferencia de una compra, donde eso sí debe ser un error.
 */
export async function restoreStock(
  items: StockDecrementItem[],
  reference: string,
  createdBy: string,
): Promise<void> {
  for (const item of items) {
    await applyStockDelta(item.productId, item.sku, item.quantity, "return", reference, createdBy);
  }
}

/**
 * Ingresa stock por una compra a proveedor confirmada. A diferencia de
 * restoreStock, acá un producto/SKU inexistente sí es un error: la compra ya
 * se creó apuntando a un catálogo real, así que un mismatch es un dato mal
 * cargado, no un caso esperable.
 */
export async function registerPurchaseStock(
  items: StockDecrementItem[],
  reference: string,
  createdBy: string,
): Promise<void> {
  for (const item of items) {
    const ok = await applyStockDelta(
      item.productId,
      item.sku,
      item.quantity,
      "purchase_in",
      reference,
      createdBy,
    );
    if (!ok) {
      throw new NotFoundError(`Producto o variante no encontrada: SKU ${item.sku}`);
    }
  }
}

export interface StockRow {
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  variantName: string;
  stock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  price: number;
  costPrice: number;
}

/**
 * Vista aplanada de stock por variante (no por producto), con la alerta de
 * stock bajo ya calculada. Es la base tanto de la vista de inventario como
 * del filtro `lowStockOnly` para un futuro badge en el listado de admin.
 */
export async function getStockOverview(query: StockQuery): Promise<PaginatedResult<StockRow>> {
  const match: Record<string, unknown> = {};
  if (query.q) {
    match.$or = [
      { name: { $regex: query.q, $options: "i" } },
      { "variants.sku": { $regex: query.q, $options: "i" } },
    ];
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $unwind: "$variants" },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        productName: "$name",
        productSlug: "$slug",
        sku: "$variants.sku",
        variantName: "$variants.name",
        stock: "$variants.stock",
        lowStockThreshold: "$variants.lowStockThreshold",
        isLowStock: { $lte: ["$variants.stock", "$variants.lowStockThreshold"] },
        price: "$variants.price",
        costPrice: "$variants.costPrice",
      },
    },
  ];

  if (query.lowStockOnly) {
    pipeline.push({ $match: { isLowStock: true } });
  }

  const skip = (query.page - 1) * query.limit;
  pipeline.push({
    $facet: {
      items: [{ $sort: { isLowStock: -1, stock: 1 } }, { $skip: skip }, { $limit: query.limit }],
      totalCount: [{ $count: "count" }],
    },
  });

  const [result] = await Product.aggregate<{
    items: StockRow[];
    totalCount: [{ count: number }] | [];
  }>(pipeline);

  const items = result?.items ?? [];
  const total = result?.totalCount[0]?.count ?? 0;

  return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}

export async function listStockMovements(
  query: MovementQuery,
): Promise<PaginatedResult<StockMovementDocument>> {
  const filter: FilterQuery<StockMovementDocument> = {};
  if (query.product) filter.product = query.product;
  if (query.type) filter.type = query.type;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = query.dateFrom;
    if (query.dateTo) filter.createdAt.$lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate("product", "name slug"),
    StockMovement.countDocuments(filter),
  ]);

  return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}
