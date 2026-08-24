import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { Category } from "../Category.js";
import { Order } from "../Order.js";
import { Product } from "../Product.js";
import { User } from "../User.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

let customerCounter = 0;

async function buildOrderInput() {
  customerCounter += 1;
  const customer = await User.create({
    email: `cliente${customerCounter}@example.com`,
    password: "supersecret",
    firstName: "Ana",
    lastName: "García",
  });
  const category = await Category.create({ name: `Fertilizantes ${customerCounter}` });
  const product = await Product.create({
    name: `Fertilizante Orgánico ${customerCounter}`,
    category: category._id,
    variants: [
      {
        sku: `SKU-100-${customerCounter}`,
        name: "1 Litro",
        price: 500000,
        costPrice: 300000,
        stock: 10,
        lowStockThreshold: 5,
        weight: 1,
      },
    ],
  });

  return {
    customer: customer._id,
    items: [
      {
        product: product._id,
        variant: product.variants[0]!,
        quantity: 2,
        unitPrice: 500000,
        subtotal: 1000000,
      },
    ],
    subtotal: 1000000,
    shippingCost: 0,
    total: 1000000,
    paymentMethod: "cash" as const,
    shippingMethod: "pickup" as const,
    shippingAddress: {
      label: "Casa",
      street: "Calle Falsa 123",
      city: "San Isidro",
      province: "Buenos Aires",
      zipCode: "1642",
      isDefault: true,
    },
  };
}

describe("Order model", () => {
  it("genera orderNumber con el formato #GS-00001", async () => {
    const order = await Order.create(await buildOrderInput());
    expect(order.orderNumber).toMatch(/^#GS-\d{5}$/);
  });

  it("incrementa el orderNumber secuencialmente", async () => {
    const first = await Order.create(await buildOrderInput());
    const second = await Order.create(await buildOrderInput());

    const firstSeq = Number(first.orderNumber.replace("#GS-", ""));
    const secondSeq = Number(second.orderNumber.replace("#GS-", ""));
    expect(secondSeq).toBe(firstSeq + 1);
  });

  it("usa 'pending' como status por defecto", async () => {
    const order = await Order.create(await buildOrderInput());
    expect(order.status).toBe("pending");
    expect(order.paymentStatus).toBe("pending");
  });

  it("requiere al menos un item", async () => {
    const input = await buildOrderInput();
    await expect(Order.create({ ...input, items: [] })).rejects.toThrow();
  });
});
