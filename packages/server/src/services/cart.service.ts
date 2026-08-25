import { Cart, type CartHydratedDocument, type CartItem } from "../models/Cart.js";
import { Product, type ProductVariant } from "../models/Product.js";

export interface CartItemView {
  product: { id: string; name: string; slug: string; image: string | null };
  variant: ProductVariant;
  quantity: number;
  subtotal: number;
  /** false si dejó de existir, está inactivo, o no hay stock suficiente */
  available: boolean;
}

export interface CartView {
  items: CartItemView[];
  subtotal: number;
}

export type CartAdjustmentReason = "no_longer_available" | "out_of_stock" | "insufficient_stock";

export interface CartAdjustment {
  variantSku: string;
  requestedQuantity: number;
  adjustedQuantity: number;
  reason: CartAdjustmentReason;
}

async function getOrCreateCart(userId: string): Promise<CartHydratedDocument> {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

async function buildCartView(cart: CartHydratedDocument): Promise<CartView> {
  const productIds = [...new Set(cart.items.map((item) => item.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const items: CartItemView[] = [];
  for (const item of cart.items) {
    const product = productById.get(item.product.toString());
    const variant = product?.variants.find((v) => v.sku === item.variantSku);
    if (!product || !variant) continue;

    items.push({
      product: {
        id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        image: product.images[0]?.url ?? null,
      },
      variant,
      quantity: item.quantity,
      subtotal: variant.price * item.quantity,
      available: product.isActive && variant.stock >= item.quantity,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, subtotal };
}

export async function getCart(userId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  return buildCartView(cart);
}

export interface SyncCartItemInput {
  productId: string;
  variantSku: string;
  quantity: number;
}

/**
 * Reemplaza el carrito completo (usado al sincronizar el carrito de
 * localStorage con el backend en el login). Cada item se revalida contra el
 * catálogo actual: si el producto/variante ya no existe se descarta, y si la
 * cantidad pedida supera el stock disponible se recorta en vez de rechazar
 * toda la sincronización.
 */
export async function syncCart(
  userId: string,
  incomingItems: SyncCartItemInput[],
): Promise<CartView & { adjustments: CartAdjustment[] }> {
  const cart = await getOrCreateCart(userId);
  const productIds = [...new Set(incomingItems.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const finalItems: CartItem[] = [];
  const adjustments: CartAdjustment[] = [];

  for (const incoming of incomingItems) {
    const product = productById.get(incoming.productId);
    const variant = product?.variants.find((v) => v.sku === incoming.variantSku);

    if (!product || !product.isActive || !variant) {
      adjustments.push({
        variantSku: incoming.variantSku,
        requestedQuantity: incoming.quantity,
        adjustedQuantity: 0,
        reason: "no_longer_available",
      });
      continue;
    }

    const adjustedQuantity = Math.min(incoming.quantity, variant.stock);
    if (adjustedQuantity <= 0) {
      adjustments.push({
        variantSku: incoming.variantSku,
        requestedQuantity: incoming.quantity,
        adjustedQuantity: 0,
        reason: "out_of_stock",
      });
      continue;
    }
    if (adjustedQuantity !== incoming.quantity) {
      adjustments.push({
        variantSku: incoming.variantSku,
        requestedQuantity: incoming.quantity,
        adjustedQuantity,
        reason: "insufficient_stock",
      });
    }

    finalItems.push({ product: product._id, variantSku: incoming.variantSku, quantity: adjustedQuantity });
  }

  cart.items = finalItems;
  await cart.save();

  const view = await buildCartView(cart);
  return { ...view, adjustments };
}

export async function setCartItem(
  userId: string,
  productId: string,
  variantSku: string,
  quantity: number,
): Promise<CartView & { adjustedQuantity: number }> {
  const cart = await getOrCreateCart(userId);
  const product = await Product.findById(productId);
  const variant = product?.variants.find((v) => v.sku === variantSku);

  const adjustedQuantity =
    !product || !product.isActive || !variant ? 0 : Math.min(Math.max(quantity, 0), variant.stock);

  const existingIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId && item.variantSku === variantSku,
  );

  if (adjustedQuantity === 0) {
    if (existingIndex >= 0) cart.items.splice(existingIndex, 1);
  } else if (existingIndex >= 0) {
    cart.items[existingIndex]!.quantity = adjustedQuantity;
  } else {
    cart.items.push({ product: product!._id, variantSku, quantity: adjustedQuantity });
  }

  await cart.save();
  const view = await buildCartView(cart);
  return { ...view, adjustedQuantity };
}

export async function removeCartItem(
  userId: string,
  productId: string,
  variantSku: string,
): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter(
    (item) => !(item.product.toString() === productId && item.variantSku === variantSku),
  );
  await cart.save();
  return buildCartView(cart);
}

export async function clearCart(userId: string): Promise<void> {
  await Cart.updateOne({ user: userId }, { items: [] }, { upsert: true });
}
