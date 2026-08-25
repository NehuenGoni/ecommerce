import { Types, type FilterQuery } from "mongoose";
import type { AuthenticatedUser } from "../middleware/auth.js";
import { Order, type OrderDocument, type OrderStatus, type PaymentStatus } from "../models/Order.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import type { MyOrdersQuery, OrderQuery } from "../validators/order.validators.js";
import { restoreStock } from "./inventory.service.js";

// Grafo de transiciones válidas: evita que un cambio de estado accidental
// reabra un pedido terminal o salte pasos del flujo real de preparación/envío.
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function listOrders(query: OrderQuery): Promise<PaginatedResult<OrderDocument>> {
  const filter: FilterQuery<OrderDocument> = {};
  if (query.status) filter.status = query.status;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.customer) filter.customer = query.customer;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = query.dateFrom;
    if (query.dateTo) filter.createdAt.$lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate("customer", "firstName lastName email"),
    Order.countDocuments(filter),
  ]);

  return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}

export async function listMyOrders(
  userId: string,
  query: MyOrdersQuery,
): Promise<PaginatedResult<OrderDocument>> {
  const filter = { customer: userId };
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Order.countDocuments(filter),
  ]);

  return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}

export async function getOrderById(
  orderId: string,
  requester: AuthenticatedUser,
): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError("Pedido no encontrado");
  }
  // Un customer que pide un pedido ajeno recibe el mismo 404 que uno
  // inexistente: no confirmamos la existencia de pedidos de otros usuarios.
  if (requester.role !== "admin" && order.customer.toString() !== requester.id) {
    throw new NotFoundError("Pedido no encontrado");
  }

  if (requester.role === "admin") {
    await order.populate("customer", "firstName lastName email");
  }
  return order;
}

export async function changeOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note: string,
  updatedBy: string,
): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError("Pedido no encontrado");
  }
  if (order.status === newStatus) {
    throw new BadRequestError(`El pedido ya está en estado "${newStatus}"`);
  }
  if (!STATUS_TRANSITIONS[order.status].includes(newStatus)) {
    throw new BadRequestError(`No se puede pasar de "${order.status}" a "${newStatus}"`);
  }

  if (newStatus === "cancelled") {
    await restoreStock(
      order.items.map((item) => ({
        productId: item.product.toString(),
        sku: item.variant.sku,
        quantity: item.quantity,
      })),
      order._id.toString(),
      updatedBy,
    );
  }

  order.status = newStatus;
  order.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy: new Types.ObjectId(updatedBy),
  });
  await order.save();

  // TODO: notificar al cliente por email (Resend) del cambio de estado.

  return order;
}

export async function setTracking(orderId: string, trackingNumber: string): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError("Pedido no encontrado");
  }
  order.trackingNumber = trackingNumber;
  await order.save();
  return order;
}

/**
 * Confirmación manual de pago (transferencia o efectivo). El pago de Mercado
 * Pago se confirma solo, vía webhook — no tiene sentido dejarlo pasar por acá.
 */
export async function confirmPayment(
  orderId: string,
  paymentStatus: Extract<PaymentStatus, "paid" | "failed">,
  note: string,
  updatedBy: string,
): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError("Pedido no encontrado");
  }
  if (order.paymentMethod === "mercadopago") {
    throw new BadRequestError("El pago de Mercado Pago se confirma automáticamente vía webhook");
  }

  order.paymentStatus = paymentStatus;

  if (paymentStatus === "paid" && order.status === "pending") {
    order.status = "confirmed";
    order.statusHistory.push({
      status: "confirmed",
      timestamp: new Date(),
      note: note || "Pago confirmado manualmente",
      updatedBy: new Types.ObjectId(updatedBy),
    });
  }

  await order.save();
  return order;
}

export async function setReceiptUrl(
  orderId: string,
  customerId: string,
  receiptUrl: string,
): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order || order.customer.toString() !== customerId) {
    throw new NotFoundError("Pedido no encontrado");
  }
  if (order.paymentMethod !== "transfer") {
    throw new BadRequestError("Solo los pedidos con pago por transferencia aceptan comprobante");
  }

  order.paymentDetails = { ...order.paymentDetails, receiptUrl };
  await order.save();
  return order;
}
