/** Configuración de precios del negocio, editable desde el admin. */
export interface PricingSettings {
  /** Margen (%) sobre el costo para calcular el precio de venta. */
  marginPercent: number;
  /** Paso de redondeo hacia arriba del precio calculado, en centavos ($100 = 10000). */
  roundingStep: number;
  /** Si es true, registrar una compra a proveedor recalcula el precio de venta de cada variante. */
  autoPriceOnPurchase: boolean;
}

export interface StoreSettings {
  pricing: PricingSettings;
}
