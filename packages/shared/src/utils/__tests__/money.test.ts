import { describe, expect, it } from "vitest";
import {
  centsToPesos,
  formatARS,
  markupFromPrice,
  parseArsAmount,
  pesosToCents,
  priceFromMarkup,
} from "../money.js";

describe("formatARS", () => {
  it("formatea centavos como pesos con punto de miles y sin decimales", () => {
    expect(formatARS(125000)).toBe("$1.250");
  });

  it("redondea centavos que no son un peso exacto", () => {
    expect(formatARS(125050)).toBe("$1.251");
  });

  it("formatea montos grandes con múltiples separadores de miles", () => {
    expect(formatARS(1234567800)).toBe("$12.345.678");
  });

  it("formatea cero", () => {
    expect(formatARS(0)).toBe("$0");
  });
});

describe("pesosToCents / centsToPesos", () => {
  it("son inversas entre sí para valores enteros", () => {
    expect(pesosToCents(1250)).toBe(125000);
    expect(centsToPesos(125000)).toBe(1250);
  });
});

describe("priceFromMarkup", () => {
  it("aplica el markup sobre el costo", () => {
    expect(priceFromMarkup(100000, 40)).toBe(140000);
  });

  it("redondea al peso entero", () => {
    // 33333 * 1.35 = 44999.55 -> $450
    expect(priceFromMarkup(33333, 35)).toBe(45000);
  });

  it("con markup 0 devuelve el costo", () => {
    expect(priceFromMarkup(100000, 0)).toBe(100000);
  });
});

describe("markupFromPrice", () => {
  it("calcula el markup con un decimal", () => {
    expect(markupFromPrice(100000, 150000)).toBe(50);
    expect(markupFromPrice(300000, 400000)).toBe(33.3);
  });

  it("devuelve null si el costo es 0", () => {
    expect(markupFromPrice(0, 150000)).toBeNull();
  });

  it("devuelve negativo si el precio es menor al costo", () => {
    expect(markupFromPrice(100000, 80000)).toBe(-20);
  });
});

describe("parseArsAmount", () => {
  it("parsea formato argentino con miles y decimales", () => {
    expect(parseArsAmount("1.234,56")).toBe(123456);
  });

  it("ignora el símbolo de moneda y espacios", () => {
    expect(parseArsAmount("$ 1.234,56")).toBe(123456);
  });

  it("acepta formato estadounidense como fallback", () => {
    expect(parseArsAmount("1,234.56")).toBe(123456);
  });

  it("interpreta un único punto con 3 dígitos como separador de miles", () => {
    expect(parseArsAmount("1.234")).toBe(123400);
  });

  it("interpreta un único punto con menos de 3 dígitos como decimal", () => {
    expect(parseArsAmount("12.5")).toBe(1250);
  });

  it("interpreta una única coma con 3 dígitos como separador de miles", () => {
    expect(parseArsAmount("1,234")).toBe(123400);
  });

  it("interpreta varias apariciones del mismo separador como miles", () => {
    expect(parseArsAmount("1.234.567,89")).toBe(123456789);
  });

  it("parsea un entero sin separadores", () => {
    expect(parseArsAmount("500")).toBe(50000);
  });

  it("devuelve null para string vacío", () => {
    expect(parseArsAmount("")).toBeNull();
  });

  it("devuelve null para un guion largo (campo sin dato)", () => {
    expect(parseArsAmount("—")).toBeNull();
  });

  it("devuelve null para texto no numérico", () => {
    expect(parseArsAmount("N/A")).toBeNull();
  });
});
