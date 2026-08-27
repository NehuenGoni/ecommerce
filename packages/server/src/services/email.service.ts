import { formatARS } from "@growshop/shared";
import { Resend } from "resend";
import { env } from "../config/env.js";
import type { OrderDocument, OrderStatus } from "../models/Order.js";

const FROM = "Growshop <pedidos@growshop.local>";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  return new Resend(env.RESEND_API_KEY);
}

/**
 * Los emails son un canal secundario: si Resend no está configurado (dev/test)
 * o falla, no debe tumbar el flujo que los dispara (registro, checkout,
 * cambio de estado). Se loguea y listo.
 *
 * Sin RESEND_API_KEY (dev sin cuenta de Resend), el email se imprime en la
 * consola del servidor en vez de perderse: así se puede probar a mano un
 * flujo como "olvidé mi contraseña" sin depender de un proveedor real.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const client = getClient();
  if (!client) {
    if (env.NODE_ENV !== "test") {
      console.log(`\n[email] (Resend no configurado) Para: ${to}\nAsunto: ${subject}\n${html}\n`);
    }
    return;
  }

  try {
    const result = await client.emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      console.error("Resend rechazó el envío:", result.error);
    }
  } catch (err) {
    console.error("Error enviando email:", err);
  }
}

function layout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2a25;">
      <h1 style="font-size: 20px; margin-bottom: 4px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #8a8779;">Growshop — Insumos de cultivo para GBA Norte.</p>
    </div>
  `;
}

export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  const html = layout(
    `¡Bienvenida/o, ${firstName}!`,
    `<p>Ya podés armar tu pedido y elegir cómo retirarlo o recibirlo.</p>`,
  );
  await sendEmail(to, "Bienvenido a Growshop", html);
}

export async function sendOrderConfirmationEmail(to: string, order: OrderDocument): Promise<void> {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<li>${item.quantity}x ${item.variant.name} — ${formatARS(item.subtotal)}</li>`,
    )
    .join("");

  const html = layout(
    `Pedido ${order.orderNumber} confirmado`,
    `
      <p>Recibimos tu pedido. Este es el resumen:</p>
      <ul>${itemsHtml}</ul>
      <p><strong>Total: ${formatARS(order.total)}</strong></p>
    `,
  );
  await sendEmail(to, `Confirmamos tu pedido ${order.orderNumber}`, html);
}

export async function sendOrderStatusChangeEmail(to: string, order: OrderDocument): Promise<void> {
  const label = ORDER_STATUS_LABELS[order.status];
  const html = layout(
    `Tu pedido ${order.orderNumber} ahora está "${label}"`,
    `<p>Podés ver el detalle y el historial completo desde tu cuenta.</p>`,
  );
  await sendEmail(to, `Actualización de tu pedido ${order.orderNumber}: ${label}`, html);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = layout(
    "Restablecer tu contraseña",
    `
      <p>Pediste restablecer tu contraseña. Este link vence en 1 hora:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si no fuiste vos, podés ignorar este email.</p>
    `,
  );
  await sendEmail(to, "Restablecer tu contraseña de Growshop", html);
}
