import { describe, expect, it } from "vitest";
import { centsToPesos, formatARS, pesosToCents } from "../money.js";

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
