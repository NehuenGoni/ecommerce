import type { ProductVariant } from "@growshop/shared";

/** Registro mínimo persistido en localStorage para el carrito anónimo. */
export interface CartItemRecord {
  productId: string;
  variantSku: string;
  quantity: number;
}

/**
 * Misma forma que devuelve GET /api/cart en el backend (ver cart.service.ts):
 * datos "en vivo" del catálogo, no una foto vieja tomada al agregar el item.
 */
export interface CartLineView {
  product: { id: string; name: string; slug: string; image: string | null };
  variant: ProductVariant;
  quantity: number;
  subtotal: number;
  available: boolean;
}
