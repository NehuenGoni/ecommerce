export type ShippingMethod = "mercadoenvios" | "moto" | "pickup";

// TODO: mantener sincronizado con packages/server/src/utils/shipping.ts (o,
// mejor, reemplazar por un endpoint de cotización real cuando exista).
// Es solo para mostrar un estimado antes de confirmar: el costo real siempre
// lo calcula el backend en POST /api/checkout.
const MOTO_FLAT_FEE_CENTS = 150000;

export function estimateShippingCost(method: ShippingMethod): number {
  switch (method) {
    case "pickup":
      return 0;
    case "moto":
      return MOTO_FLAT_FEE_CENTS;
    case "mercadoenvios":
      return 0;
  }
}

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  mercadoenvios: "Mercado Envíos",
  moto: "Envío por moto (GBA Norte)",
  pickup: "Retiro en punto",
};
