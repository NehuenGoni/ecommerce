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

/**
 * Parsea un importe en formato argentino ("1.234,56") o, como fallback, en
 * formato estadounidense ("1.234.56" -> no; "1,234.56"), a centavos enteros.
 * Se usa para convertir los strings crudos que devuelve el modelo de
 * extracción de facturas: nunca le pedimos aritmética al LLM, la hacemos acá.
 *
 * Si aparecen los dos separadores, el que está más a la derecha es el
 * decimal. Si aparece uno solo una única vez y tiene exactamente 3 dígitos
 * detrás, se asume separador de miles (ej. "1.234" -> 1234 pesos); si no,
 * se asume decimal (ej. "12.5" -> 12,5 pesos). Varias apariciones del mismo
 * separador son siempre de miles (ej. "1.234.567" -> 1234567 pesos).
 *
 * Devuelve null si el string está vacío o no es un número reconocible.
 */
export function parseArsAmount(raw: string): number | null {
  if (!raw) return null;

  const cleaned = raw.trim().replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    // Aparecen los dos: el más a la derecha es el separador decimal.
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma !== -1 || lastDot !== -1) {
    const sep = lastComma !== -1 ? "," : ".";
    const occurrences = cleaned.split(sep).length - 1;
    const digitsAfterLast = cleaned.length - cleaned.lastIndexOf(sep) - 1;
    const isThousandsSeparator = occurrences > 1 || digitsAfterLast === 3;
    normalized = isThousandsSeparator
      ? cleaned.split(sep).join("")
      : cleaned.replace(sep, ".");
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return Math.round(value * 100);
}
