import type { FilterQuery } from "mongoose";
import { Product } from "../models/Product.js";
import {
  SupplierPurchase,
  type SupplierPurchaseDocument,
  type SupplierPurchaseItem,
} from "../models/SupplierPurchase.js";
import type { PaginatedResult } from "../utils/pagination.js";
import type { CreatePurchaseInput, PurchaseQuery } from "../validators/supplierPurchase.validators.js";
import { NotFoundError } from "../utils/errors.js";
import { registerPurchaseStock } from "./inventory.service.js";

export async function listPurchases(
  query: PurchaseQuery,
): Promise<PaginatedResult<SupplierPurchaseDocument>> {
  const filter: FilterQuery<SupplierPurchaseDocument> = {};
  if (query.supplier) filter.supplier = { $regex: query.supplier, $options: "i" };
  if (query.product) filter["items.product"] = query.product;
  if (query.dateFrom || query.dateTo) {
    filter.purchaseDate = {};
    if (query.dateFrom) filter.purchaseDate.$gte = query.dateFrom;
    if (query.dateTo) filter.purchaseDate.$lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    SupplierPurchase.find(filter)
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate("items.product", "name slug"),
    SupplierPurchase.countDocuments(filter),
  ]);

  return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}

export async function getPurchaseById(id: string): Promise<SupplierPurchaseDocument> {
  const purchase = await SupplierPurchase.findById(id)
    .populate("items.product", "name slug")
    .populate("createdBy", "firstName lastName email");
  if (!purchase) {
    throw new NotFoundError("Compra no encontrada");
  }
  return purchase;
}

/**
 * Registra una compra a proveedor y actualiza el stock automáticamente, como
 * pide el brief. Si el ingreso de stock falla (ej. un SKU mal cargado que no
 * existe en el producto), se elimina la compra recién creada: no queremos un
 * registro de compra "fantasma" que nunca movió el inventario real.
 */
export async function createPurchase(
  input: CreatePurchaseInput,
  createdBy: string,
): Promise<SupplierPurchaseDocument> {
  const productIds = [...new Set(input.items.map((item) => item.product))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const items: SupplierPurchaseItem[] = [];
  for (const item of input.items) {
    const product = productById.get(item.product);
    const variantExists = product?.variants.some((v) => v.sku === item.variant);
    if (!product || !variantExists) {
      throw new NotFoundError(`Producto o variante no encontrada: SKU ${item.variant}`);
    }
    items.push({
      product: product._id,
      variant: item.variant,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.unitCost * item.quantity,
    });
  }

  const purchase = await SupplierPurchase.create({
    supplier: input.supplier,
    items,
    purchaseDate: input.purchaseDate,
    notes: input.notes,
    createdBy,
  });

  try {
    await registerPurchaseStock(
      items.map((item) => ({
        productId: item.product.toString(),
        sku: item.variant,
        quantity: item.quantity,
      })),
      purchase._id.toString(),
      createdBy,
    );
  } catch (err) {
    await purchase.deleteOne();
    throw err;
  }

  return purchase;
}
