import { describe, expect, it } from "vitest";
import { applyMargin, marginFromPrices, netFromGross, roundUpToStep } from "../pricing.js";

describe("applyMargin", () => {
  it("aplica un margen porcentual sobre el costo", () => {
    expect(applyMargin(10000, 60)).toBe(16000);
  });

  it("con margen 0 devuelve el mismo costo", () => {
    expect(applyMargin(10000, 0)).toBe(10000);
  });

  it("con costo 0 devuelve 0 sin importar el margen", () => {
    expect(applyMargin(0, 60)).toBe(0);
  });

  it("redondea al centavo más cercano", () => {
    expect(applyMargin(999, 33)).toBe(1329); // 999 * 1.33 = 1328.67
  });
});

describe("roundUpToStep", () => {
  it("redondea hacia arriba al múltiplo de step más cercano", () => {
    expect(roundUpToStep(17483, 10000)).toBe(20000);
  });

  it("no cambia un valor que ya es múltiplo exacto", () => {
    expect(roundUpToStep(20000, 10000)).toBe(20000);
  });

  it("redondea un valor apenas por encima del múltiplo", () => {
    expect(roundUpToStep(10001, 10000)).toBe(20000);
  });

  it("devuelve el valor sin cambios si el step es 0 o negativo", () => {
    expect(roundUpToStep(17483, 0)).toBe(17483);
    expect(roundUpToStep(17483, -100)).toBe(17483);
  });
});

describe("netFromGross", () => {
  it("descuenta el IVA de un importe con impuesto incluido", () => {
    expect(netFromGross(12100, 21)).toBe(10000);
  });

  it("con alícuota 0 devuelve el mismo importe", () => {
    expect(netFromGross(10000, 0)).toBe(10000);
  });
});

describe("marginFromPrices", () => {
  it("calcula el margen efectivo entre costo y precio", () => {
    expect(marginFromPrices(10000, 16000)).toBe(60);
  });

  it("devuelve 0 si el costo es 0", () => {
    expect(marginFromPrices(0, 16000)).toBe(0);
  });

  it("es la inversa de applyMargin", () => {
    const cost = 10000;
    const price = applyMargin(cost, 45);
    expect(marginFromPrices(cost, price)).toBeCloseTo(45, 5);
  });
});
