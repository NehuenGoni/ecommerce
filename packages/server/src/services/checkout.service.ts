import { Cart } from "../models/Cart.js";
import { Order, type OrderDocument, type OrderItem, type PaymentStatus } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { BadRequestError, ConflictError } from "../utils/errors.js";
import { calculateShippingCost } from "../utils/shipping.js";
import type { CheckoutInput } from "../validators/checkout.validators.js";
import { decrementStock } from "./inventory.service.js";
import { createCheckoutPreference, getPaymentInfo } from "./mercadopago.service.js";

export interface CheckoutResult {
  order: OrderDocument;
  paymentRedirectUrl?: string;
}

export async function checkout(userId: string, input: CheckoutInput): Promise<CheckoutResult> {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw new BadRequestError("El carrito está vacío");
  }

  const productIds = [...new Set(cart.items.map((item) => item.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const orderItems: OrderItem[] = [];
  for (const cartItem of cart.items) {
    const product = productById.get(cartItem.product.toString());
    const variant = product?.variants.find((v) => v.sku === cartItem.variantSku);

    if (!product || !product.isActive || !variant) {
      throw new ConflictError(
        `"${product?.name ?? cartItem.variantSku}" ya no está disponible. Actualizá tu carrito.`,
      );
    }
    if (variant.stock < cartItem.quantity) {
      throw new ConflictError(
        `Stock insuficiente para "${product.name} - ${variant.name}" (disponible: ${variant.stock})`,
      );
    }

    orderItems.push({
      product: product._id,
      variant,
      quantity: cartItem.quantity,
      unitPrice: variant.price,
      subtotal: variant.price * cartItem.quantity,
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingCost = calculateShippingCost(input.shippingMethod);
  const total = subtotal + shippingCost;

  const order = await Order.create({
    customer: userId,
    items: orderItems,
    subtotal,
    shippingCost,
    total,
    status: "pending",
    statusHistory: [{ status: "pending", timestamp: new Date(), note: "Pedido creado", updatedBy: userId }],
    paymentMethod: input.paymentMethod,
    paymentStatus: "pending",
    shippingMethod: input.shippingMethod,
    shippingAddress: { ...input.shippingAddress, isDefault: false },
    customerNotes: input.customerNotes,
  });

  try {
    await decrementStock(
      orderItems.map((item) => ({
        productId: item.product.toString(),
        sku: item.variant.sku,
        quantity: item.quantity,
      })),
      order._id.toString(),
      userId,
    );
  } catch (err) {
    // el descuento de stock falló (condición de carrera con otro checkout):
    // el pedido nunca llegó a confirmarse, así que lo eliminamos
    await order.deleteOne();
    throw err;
  }

  cart.items = [];
  await cart.save();

  // TODO: enviar email de confirmación de pedido (Resend) una vez integrado.

  if (input.paymentMethod === "mercadopago") {
    // A esta altura el pedido y el stock ya están confirmados: si Mercado
    // Pago falla acá, no revertimos la venta. El pedido queda en paymentStatus
    // "pending" y el cliente puede reintentar el pago o contactar soporte.
    const preference = await createCheckoutPreference(order._id.toString(), total);
    order.paymentDetails = { preferenceId: preference.preferenceId };
    await order.save();
    return { order, paymentRedirectUrl: preference.initPoint };
  }

  return { order };
}

function mapMercadoPagoStatus(mpStatus: string): PaymentStatus {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "rejected":
      return "failed";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

function extractPaymentId(
  query: Record<string, unknown>,
  body: Record<string, unknown>,
): string | null {
  const type = (query.type ?? query.topic ?? (body as { type?: string }).type) as string | undefined;
  if (type && type !== "payment") return null;

  const id =
    (query["data.id"] as string | undefined) ??
    (body as { data?: { id?: string } }).data?.id ??
    (query.id as string | undefined);
  return id ?? null;
}

export async function handleMercadoPagoWebhook(
  query: Record<string, unknown>,
  body: Record<string, unknown>,
): Promise<void> {
  const paymentId = extractPaymentId(query, body);
  if (!paymentId) return;

  const info = await getPaymentInfo(paymentId);
  if (!info.externalReference) return;

  const order = await Order.findById(info.externalReference);
  if (!order) return;

  order.paymentDetails = { ...order.paymentDetails, mpPaymentId: paymentId, mpStatus: info.status };
  order.paymentStatus = mapMercadoPagoStatus(info.status);

  if (order.paymentStatus === "paid" && order.status === "pending") {
    order.status = "confirmed";
    order.statusHistory.push({
      status: "confirmed",
      timestamp: new Date(),
      note: "Pago confirmado por Mercado Pago",
      updatedBy: order.customer,
    });
  }

  await order.save();
}
