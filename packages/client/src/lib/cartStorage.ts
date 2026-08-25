import { apiFetch } from "@/lib/api";
import { sortedImages } from "@/lib/catalog";
import type { CartItemRecord, CartLineView } from "@/types/cart";
import type { ProductListItem } from "@/types/catalog";

const CART_STORAGE_KEY = "growshop-cart";

export function readLocalCartRecords(): CartItemRecord[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItemRecord[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalCartRecords(records: CartItemRecord[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // localStorage no disponible (modo privado, cuota llena, etc.): el carrito no persiste
  }
}

/**
 * Reconstruye la vista del carrito anónimo pidiendo cada producto por su ID
 * actual (mismo criterio que buildCartView en el backend: precio y stock
 * "en vivo", no lo que había cuando se agregó). Un carrito típico tiene pocos
 * items, así que N fetches individuales es más simple que sumar un endpoint
 * de batch al backend solo para este caso.
 */
export async function buildAnonymousCartView(records: CartItemRecord[]): Promise<CartLineView[]> {
  const uniqueIds = [...new Set(records.map((r) => r.productId))];
  const products = await Promise.all(
    uniqueIds.map((id) =>
      apiFetch<{ product: ProductListItem }>(`/products/${id}`)
        .then((res) => res.product)
        .catch(() => null),
    ),
  );
  const productById = new Map(products.filter((p): p is ProductListItem => p !== null).map((p) => [p._id, p]));

  const views: CartLineView[] = [];
  for (const record of records) {
    const product = productById.get(record.productId);
    const variant = product?.variants.find((v) => v.sku === record.variantSku);
    if (!product || !variant) continue;

    views.push({
      product: {
        id: product._id,
        name: product.name,
        slug: product.slug,
        image: sortedImages(product.images)[0]?.url ?? null,
      },
      variant,
      quantity: record.quantity,
      subtotal: variant.price * record.quantity,
      available: product.isActive && variant.stock >= record.quantity,
    });
  }
  return views;
}
