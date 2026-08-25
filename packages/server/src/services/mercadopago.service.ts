import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

function getClient(): MercadoPagoConfig {
  if (!env.MP_ACCESS_TOKEN) {
    throw new AppError("Mercado Pago no está configurado en este entorno", 503);
  }
  return new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });
}

export interface MercadoPagoPreferenceResult {
  preferenceId: string;
  initPoint: string;
}

/**
 * Crea una preferencia de Checkout Pro para el total del pedido. Usamos un
 * único item genérico (no uno por producto): además de ser más simple,
 * evita que los filtros automáticos de contenido de MP vean títulos de
 * producto — coherente con publicar todo bajo nombres neutros.
 */
export async function createCheckoutPreference(
  orderId: string,
  totalCents: number,
): Promise<MercadoPagoPreferenceResult> {
  const client = getClient();
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          id: orderId,
          title: "Productos para el hogar y jardín",
          quantity: 1,
          unit_price: totalCents / 100,
          currency_id: "ARS",
        },
      ],
      external_reference: orderId,
      back_urls: {
        success: `${env.CLIENT_URL}/pedidos/${orderId}?pago=exitoso`,
        failure: `${env.CLIENT_URL}/pedidos/${orderId}?pago=fallido`,
        pending: `${env.CLIENT_URL}/pedidos/${orderId}?pago=pendiente`,
      },
      auto_return: "approved",
      // TODO: configurar SERVER_URL (dominio público de Fly.io) en
      // producción para que Mercado Pago pueda notificar el webhook de pago.
      notification_url: env.SERVER_URL
        ? `${env.SERVER_URL}/api/checkout/mercadopago/webhook`
        : undefined,
    },
  });

  if (!result.id || !result.init_point) {
    throw new AppError("Mercado Pago no devolvió una preferencia válida", 502);
  }

  return { preferenceId: result.id, initPoint: result.init_point };
}

export interface MercadoPagoPaymentInfo {
  status: string;
  externalReference: string | null;
}

export async function getPaymentInfo(paymentId: string): Promise<MercadoPagoPaymentInfo> {
  const client = getClient();
  const payment = new Payment(client);
  const result = await payment.get({ id: paymentId });

  return {
    status: result.status ?? "unknown",
    externalReference: result.external_reference ?? null,
  };
}
