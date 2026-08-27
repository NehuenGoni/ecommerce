import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../services/email.service.js", () => ({
  sendWelcomeEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(),
  sendOrderStatusChangeEmail: vi.fn(),
}));

import { createApp } from "../../app.js";
import { Category } from "../../models/Category.js";
import { Order, type OrderStatus, type PaymentMethod } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import * as emailService from "../../services/email.service.js";
import { createAdminWithToken, createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function buildProduct(stock = 10) {
  const category = await Category.create({ name: "Fertilizantes" });
  return Product.create({
    name: "Fertilizante Orgánico",
    category: category._id,
    variants: [{ sku: "SKU-ORD-1", name: "1L", price: 200000, costPrice: 100000, stock, weight: 1 }],
  });
}

async function createOrder(
  customerId: string,
  productId: string,
  variant: unknown,
  overrides: Record<string, unknown> = {},
) {
  return Order.create({
    customer: customerId,
    items: [{ product: productId, variant, quantity: 1, unitPrice: 200000, subtotal: 200000 }],
    subtotal: 200000,
    shippingCost: 0,
    total: 200000,
    paymentMethod: "cash",
    shippingMethod: "pickup",
    shippingAddress: {
      street: "Calle Falsa 123",
      city: "San Isidro",
      province: "Buenos Aires",
      zipCode: "1642",
    },
    ...overrides,
  });
}

describe("GET /api/orders (admin)", () => {
  it("rechaza si el usuario no es admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("filtra por status", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct();
    await createOrder(customer._id.toString(), product._id.toString(), product.variants[0], {
      status: "pending",
    });
    await createOrder(customer._id.toString(), product._id.toString(), product.variants[0], {
      status: "delivered",
      statusHistory: [],
    });

    const res = await request(app)
      .get("/api/orders?status=pending")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].status).toBe("pending");
  });
});

describe("GET /api/orders/mine", () => {
  it("solo devuelve los pedidos del usuario autenticado", async () => {
    const { user: customerA, accessToken: tokenA } = await createUserWithToken("customer");
    const { user: customerB } = await createUserWithToken("customer");
    const product = await buildProduct();
    await createOrder(customerA._id.toString(), product._id.toString(), product.variants[0]);
    await createOrder(customerB._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app).get("/api/orders/mine").set("Authorization", `Bearer ${tokenA}`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].customer).toBe(customerA._id.toString());
  });
});

describe("GET /api/orders/:id", () => {
  it("un customer no puede ver el pedido de otro (404, no 403)", async () => {
    const { user: owner } = await createUserWithToken("customer");
    const { accessToken: strangerToken } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(owner._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(404);
  });

  it("el dueño del pedido sí puede verlo", async () => {
    const { user: owner, accessToken } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(owner._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order._id).toBe(order._id.toString());
  });

  it("un admin puede ver cualquier pedido", async () => {
    const { user: owner } = await createUserWithToken("customer");
    const { accessToken: adminToken } = await createAdminWithToken();
    const product = await buildProduct();
    const order = await createOrder(owner._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/orders/:id/status", () => {
  it("permite una transición válida y la agrega al statusHistory", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(customer._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "confirmed", note: "Pago verificado" });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("confirmed");
    const lastEntry = res.body.order.statusHistory.at(-1);
    expect(lastEntry.status).toBe("confirmed");
    expect(lastEntry.note).toBe("Pago verificado");

    expect(emailService.sendOrderStatusChangeEmail).toHaveBeenCalledWith(
      customer.email,
      expect.objectContaining({ status: "confirmed" }),
    );
  });

  it("rechaza una transición inválida (saltar pasos)", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(customer._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "shipped" });

    expect(res.status).toBe(400);
  });

  it("rechaza reabrir un pedido en estado terminal", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(customer._id.toString(), product._id.toString(), product.variants[0], {
      status: "delivered",
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "pending" });

    expect(res.status).toBe(400);
  });

  it("al cancelar, restaura el stock descontado", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct(10);
    // simula que el checkout ya había descontado 1 unidad
    product.variants[0]!.stock = 9;
    await product.save();
    const order = await createOrder(customer._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "cancelled", note: "Cliente se arrepintió" });

    expect(res.status).toBe(200);
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]!.stock).toBe(10);
  });

  it("rechaza sin ser admin", async () => {
    const { accessToken } = await createUserWithToken("customer");
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(customer._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/orders/:id/tracking", () => {
  it("setea el número de tracking", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(customer._id.toString(), product._id.toString(), product.variants[0]);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/tracking`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ trackingNumber: "TRACK-123" });

    expect(res.status).toBe(200);
    expect(res.body.order.trackingNumber).toBe("TRACK-123");
  });
});

describe("PATCH /api/orders/:id/payment", () => {
  it("confirma el pago de una transferencia y avanza el pedido a confirmed", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(customer._id.toString(), product._id.toString(), product.variants[0], {
      paymentMethod: "transfer" satisfies PaymentMethod,
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/payment`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ paymentStatus: "paid" });

    expect(res.status).toBe(200);
    expect(res.body.order.paymentStatus).toBe("paid");
    expect(res.body.order.status).toBe("confirmed" satisfies OrderStatus);
  });

  it("rechaza confirmar manualmente un pago de mercadopago", async () => {
    const { accessToken } = await createAdminWithToken();
    const { user: customer } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(customer._id.toString(), product._id.toString(), product.variants[0], {
      paymentMethod: "mercadopago" satisfies PaymentMethod,
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/payment`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ paymentStatus: "paid" });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/orders/:id/receipt", () => {
  it("el dueño puede subir el comprobante de un pedido por transferencia", async () => {
    const { user: owner, accessToken } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(owner._id.toString(), product._id.toString(), product.variants[0], {
      paymentMethod: "transfer" satisfies PaymentMethod,
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/receipt`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ receiptUrl: "https://res.cloudinary.com/demo/image/upload/receipt.jpg" });

    expect(res.status).toBe(200);
    expect(res.body.order.paymentDetails.receiptUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
    );
  });

  it("rechaza si el pedido no es por transferencia", async () => {
    const { user: owner, accessToken } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(owner._id.toString(), product._id.toString(), product.variants[0], {
      paymentMethod: "cash" satisfies PaymentMethod,
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/receipt`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ receiptUrl: "https://res.cloudinary.com/demo/image/upload/receipt.jpg" });

    expect(res.status).toBe(400);
  });

  it("rechaza subir comprobante para el pedido de otro usuario", async () => {
    const { user: owner } = await createUserWithToken("customer");
    const { accessToken: strangerToken } = await createUserWithToken("customer");
    const product = await buildProduct();
    const order = await createOrder(owner._id.toString(), product._id.toString(), product.variants[0], {
      paymentMethod: "transfer" satisfies PaymentMethod,
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/receipt`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ receiptUrl: "https://res.cloudinary.com/demo/image/upload/receipt.jpg" });

    expect(res.status).toBe(404);
  });
});
