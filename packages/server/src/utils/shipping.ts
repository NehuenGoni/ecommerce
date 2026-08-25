import type { ShippingMethod } from "../models/Order.js";

// TODO: reemplazar por tarifas reales — zonas de GBA Norte para envío en
// moto, y cotización en vivo contra la API de Mercado Envíos.
const MOTO_FLAT_FEE_CENTS = 150000; // $1.500 ARS

export function calculateShippingCost(method: ShippingMethod): number {
  switch (method) {
    case "pickup":
      return 0;
    case "moto":
      return MOTO_FLAT_FEE_CENTS;
    case "mercadoenvios":
      // TODO: integración con Mercado Envíos para cotizar el costo real.
      return 0;
  }
}
