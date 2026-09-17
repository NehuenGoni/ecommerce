/**
 * Aplica un margen porcentual sobre un costo en centavos.
 * Ej: applyMargin(10000, 60) -> 16000 (60% de margen sobre un costo de $100).
 */
export function applyMargin(costCents: number, marginPercent: number): number {
  return Math.round(costCents * (1 + marginPercent / 100));
}

/**
 * Redondea hacia arriba al múltiplo de stepCents más cercano. Se usa para que
 * un precio calculado por margen no termine en un valor como $17.483,20:
 * nadie publica un precio así en un growshop.
 */
export function roundUpToStep(cents: number, stepCents: number): number {
  if (stepCents <= 0) return cents;
  return Math.ceil(cents / stepCents) * stepCents;
}

/**
 * Convierte un importe con IVA incluido a su valor neto (sin IVA), dada la
 * alícuota. Ej: netFromGross(12100, 21) -> 10000. Se usa porque el costo de
 * las variantes se guarda siempre neto, y una factura puede discriminar el
 * IVA o no.
 */
export function netFromGross(grossCents: number, taxPercent: number): number {
  return Math.round(grossCents / (1 + taxPercent / 100));
}

/**
 * Margen efectivo (%) entre un costo y un precio de venta, ambos en
 * centavos. Es la inversa de applyMargin; se usa para prellenar el input de
 * margen de una línea cuando el precio ya fue editado a mano.
 */
export function marginFromPrices(costCents: number, priceCents: number): number {
  if (costCents <= 0) return 0;
  return ((priceCents - costCents) / costCents) * 100;
}
