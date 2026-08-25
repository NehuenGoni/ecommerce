import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../services/mercadopago.service.js", () => ({
  createCheckoutPreference: vi.fn(),
  getPaymentInfo: vi.fn(),
}));

import { createApp } from "../../app.js";
import { Cart } from "../../models/Cart.js";
import { Category } from "../../models/Category.js";
import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import * as mpService from "../../services/mercadopago.service.js";
import { createUserWithToken } from "../../test/authHelpers.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";

const app = createApp("http://localhost:5173");

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function buildProductAndCart(accessToken: string, userId: string, stock = 10, quantity = 2) {
  const category = await Category.create({ name: "Fertilizantes" });
  const product = await Product.create({
    name: "Fertilizante Orgánico",
    category: category._id,
    variants: [
      { sku: "SKU-CO-1", name: "1L", price: 200000, costPrice: 100000, stock, weight: 1 },
    ],
  });
  await Cart.create({
    user: userId,
    items: [{ product: product._id, variantSku: "SKU-CO-1", quantity }],
  });
  return product;
}

const validCheckoutBody = {
  shippingAddress: { street: "Calle Falsa 123", city: "San Isidro", province: "Buenos Aires", zipCode: "1642" },
  shippingMethod: "pickup",
  paymentMethod: "cash",
};

describe("POST /api/checkout", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).post("/api/checkout").send(validCheckoutBody);
    expect(res.status).toBe(401);
  });

  it("rechaza con el carrito vacío", async () => {
    const { accessToken } = await createUserWithToken();
    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validCheckoutBody);
    expect(res.status).toBe(400);
  });

  it("rechaza efectivo combinado con Mercado Envíos", async () => {
    const { accessToken, user } = await createUserWithToken();
    await buildProductAndCart(accessToken, user._id.toString());

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validCheckoutBody, paymentMethod: "cash", shippingMethod: "mercadoenvios" });

    expect(res.status).toBe(400);
  });

  it("crea el pedido, descuenta stock y vacía el carrito (pago en efectivo, retiro)", async () => {
    const { accessToken, user } = await createUserWithToken();
    const product = await buildProductAndCart(accessToken, user._id.toString(), 10, 2);

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validCheckoutBody);

    expect(res.status).toBe(201);
    expect(res.body.order.orderNumber).toMatch(/^#GS-\d{5}$/);
    expect(res.body.order.subtotal).toBe(400000);
    expect(res.body.order.shippingCost).toBe(0); // pickup
    expect(res.body.order.total).toBe(400000);
    expect(res.body.order.status).toBe("pending");
    expect(res.body.order.paymentStatus).toBe("pending");
    expect(res.body.paymentRedirectUrl).toBeUndefined();

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]!.stock).toBe(8);

    const cart = await Cart.findOne({ user: user._id });
    expect(cart?.items).toEqual([]);
  });

  it("cobra el flat fee de envío en moto", async () => {
    const { accessToken, user } = await createUserWithToken();
    await buildProductAndCart(accessToken, user._id.toString());

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validCheckoutBody, shippingMethod: "moto" });

    expect(res.body.order.shippingCost).toBe(150000);
    expect(res.body.order.total).toBe(res.body.order.subtotal + 150000);
  });

  it("rechaza si no hay stock suficiente y no crea el pedido", async () => {
    const { accessToken, user } = await createUserWithToken();
    await buildProductAndCart(accessToken, user._id.toString(), 1, 5);

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validCheckoutBody);

    expect(res.status).toBe(409);
    const orders = await Order.find({ customer: user._id });
    expect(orders).toHaveLength(0);

    const cart = await Cart.findOne({ user: user._id });
    expect(cart?.items).toHaveLength(1); // el carrito no se tocó
  });

  it("con Mercado Pago: crea la preferencia y devuelve la URL de redirect", async () => {
    vi.mocked(mpService.createCheckoutPreference).mockResolvedValue({
      preferenceId: "pref-123",
      initPoint: "https://mp.example.com/checkout/pref-123",
    });
    const { accessToken, user } = await createUserWithToken();
    await buildProductAndCart(accessToken, user._id.toString());

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validCheckoutBody, paymentMethod: "mercadopago" });

    expect(res.status).toBe(201);
    expect(res.body.paymentRedirectUrl).toBe("https://mp.example.com/checkout/pref-123");
    expect(res.body.order.paymentDetails.preferenceId).toBe("pref-123");
    expect(mpService.createCheckoutPreference).toHaveBeenCalledWith(
      res.body.order._id,
      res.body.order.total,
    );
  });
});

describe("POST /api/checkout/mercadopago/webhook", () => {
  async function createPendingOrder(userId: string, productId: string, variant: unknown) {
    return Order.create({
      customer: userId,
      items: [{ product: productId, variant, quantity: 1, unitPrice: 200000, subtotal: 200000 }],
      subtotal: 200000,
      shippingCost: 0,
      total: 200000,
      paymentMethod: "mercadopago",
      shippingMethod: "pickup",
      shippingAddress: { street: "Calle Falsa 123", city: "San Isidro", province: "Buenos Aires", zipCode: "1642" },
    });
  }

  it("marca el pedido como pagado y confirmado cuando el pago fue aprobado", async () => {
    const { user } = await createUserWithToken();
    const category = await Category.create({ name: "Fertilizantes" });
    const product = await Product.create({
      name: "Fertilizante",
      category: category._id,
      variants: [{ sku: "SKU-WH-1", name: "1L", price: 200000, costPrice: 100000, stock: 5, weight: 1 }],
    });
    const order = await createPendingOrder(user._id.toString(), product._id.toString(), product.variants[0]);

    vi.mocked(mpService.getPaymentInfo).mockResolvedValue({
      status: "approved",
      externalReference: order._id.toString(),
    });

    const res = await request(app)
      .post("/api/checkout/mercadopago/webhook")
      .query({ type: "payment", "data.id": "payment-1" })
      .send();

    expect(res.status).toBe(200);
    const updated = await Order.findById(order._id);
    expect(updated?.paymentStatus).toBe("paid");
    expect(updated?.status).toBe("confirmed");
    expect(updated?.paymentDetails.mpPaymentId).toBe("payment-1");
  });

  it("marca el pedido como fallido cuando el pago fue rechazado", async () => {
    const { user } = await createUserWithToken();
    const category = await Category.create({ name: "Fertilizantes" });
    const product = await Product.create({
      name: "Fertilizante",
      category: category._id,
      variants: [{ sku: "SKU-WH-2", name: "1L", price: 200000, costPrice: 100000, stock: 5, weight: 1 }],
    });
    const order = await createPendingOrder(user._id.toString(), product._id.toString(), product.variants[0]);

    vi.mocked(mpService.getPaymentInfo).mockResolvedValue({
      status: "rejected",
      externalReference: order._id.toString(),
    });

    await request(app)
      .post("/api/checkout/mercadopago/webhook")
      .query({ type: "payment", "data.id": "payment-2" })
      .send();

    const updated = await Order.findById(order._id);
    expect(updated?.paymentStatus).toBe("failed");
    expect(updated?.status).toBe("pending");
  });

  it("ignora notificaciones que no son de pago sin romper", async () => {
    const res = await request(app)
      .post("/api/checkout/mercadopago/webhook")
      .query({ type: "merchant_order", "data.id": "mo-1" })
      .send();

    expect(res.status).toBe(200);
    expect(mpService.getPaymentInfo).not.toHaveBeenCalled();
  });
});
