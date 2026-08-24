/** Convierte centavos a un string formateado en ARS: punto de miles, sin decimales. Ej: 125000 -> "$1.250" */
export function formatARS(cents: number): string {
  const pesos = Math.round(cents / 100);
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(pesos);
  return `$${formatted}`;
}

export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}

export function centsToPesos(cents: number): number {
  return Math.round(cents / 100);
}
