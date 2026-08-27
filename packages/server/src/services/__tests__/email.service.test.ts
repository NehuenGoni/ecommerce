import { describe, expect, it } from "vitest";
import type { OrderDocument } from "../../models/Order.js";
import {
  sendOrderConfirmationEmail,
  sendOrderStatusChangeEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../email.service.js";

// RESEND_API_KEY no está seteado en el entorno de test (ver vitest.config.ts):
// getClient() devuelve null y sendEmail hace no-op antes de tocar la red, así
// que estas llamadas nunca deberían tirar, esté o no configurado Resend.
function fakeOrder(overrides: Partial<OrderDocument> = {}): OrderDocument {
  return {
    orderNumber: "#GS-00001",
    items: [
      {
        product: "prod-1",
        variant: { sku: "SKU-1", name: "1L", price: 100000, costPrice: 50000, stock: 5, lowStockThreshold: 2, weight: 1 },
        quantity: 2,
        unitPrice: 100000,
        subtotal: 200000,
      },
    ],
    total: 200000,
    status: "pending",
    ...overrides,
  } as unknown as OrderDocument;
}

describe("email.service (Resend no configurado en test)", () => {
  it("sendWelcomeEmail no tira aunque Resend no esté configurado", async () => {
    await expect(sendWelcomeEmail("cliente@example.com", "Ana")).resolves.toBeUndefined();
  });

  it("sendPasswordResetEmail no tira aunque Resend no esté configurado", async () => {
    await expect(
      sendPasswordResetEmail("cliente@example.com", "http://localhost:5173/restablecer-contrasena?token=abc"),
    ).resolves.toBeUndefined();
  });

  it("sendOrderConfirmationEmail no tira aunque Resend no esté configurado", async () => {
    await expect(sendOrderConfirmationEmail("cliente@example.com", fakeOrder())).resolves.toBeUndefined();
  });

  it("sendOrderStatusChangeEmail no tira aunque Resend no esté configurado", async () => {
    await expect(
      sendOrderStatusChangeEmail("cliente@example.com", fakeOrder({ status: "shipped" })),
    ).resolves.toBeUndefined();
  });
});
