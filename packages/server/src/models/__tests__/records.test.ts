import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { Category } from "../Category.js";
import { Invoice } from "../Invoice.js";
import { Order } from "../Order.js";
import { Product } from "../Product.js";
import { StockMovement } from "../StockMovement.js";
import { SupplierPurchase } from "../SupplierPurchase.js";
import { User } from "../User.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function buildBaseFixtures() {
  const admin = await User.create({
    email: "admin@example.com",
    password: "supersecret",
    firstName: "Admin",
    lastName: "Growshop",
    role: "admin",
  });
  const category = await Category.create({ name: "Sustratos" });
  const product = await Product.create({
    name: "Sustrato Premium",
    category: category._id,
    variants: [
      {
        sku: "SKU-200",
        name: "50 Litros",
        price: 800000,
        costPrice: 500000,
        stock: 20,
        lowStockThreshold: 5,
        weight: 50,
      },
    ],
  });
  return { admin, category, product };
}

describe("SupplierPurchase model", () => {
  it("crea una compra con items válidos", async () => {
    const { admin, product } = await buildBaseFixtures();
    const purchase = await SupplierPurchase.create({
      supplier: "Proveedor SRL",
      items: [{ product: product._id, variant: "SKU-200", quantity: 10, unitCost: 500000, totalCost: 5000000 }],
      createdBy: admin._id,
    });

    expect(purchase.purchaseDate).toBeInstanceOf(Date);
    expect(purchase.items).toHaveLength(1);
  });

  it("requiere al menos un item", async () => {
    const { admin } = await buildBaseFixtures();
    await expect(
      SupplierPurchase.create({ supplier: "Proveedor SRL", items: [], createdBy: admin._id }),
    ).rejects.toThrow();
  });
});

describe("StockMovement model", () => {
  it("registra un movimiento de stock", async () => {
    const { admin, product } = await buildBaseFixtures();
    const movement = await StockMovement.create({
      product: product._id,
      variantSku: "SKU-200",
      type: "purchase_in",
      quantity: 10,
      previousStock: 20,
      newStock: 30,
      createdBy: admin._id,
    });

    expect(movement.type).toBe("purchase_in");
    expect(movement.newStock - movement.previousStock).toBe(movement.quantity);
  });
});

describe("Invoice model", () => {
  it("crea una factura en estado draft por defecto", async () => {
    const { product } = await buildBaseFixtures();
    const customer = await User.create({
      email: "cliente-factura@example.com",
      password: "supersecret",
      firstName: "Cliente",
      lastName: "Factura",
    });
    const order = await Order.create({
      customer: customer._id,
      items: [
        {
          product: product._id,
          variant: product.variants[0]!,
          quantity: 1,
          unitPrice: 800000,
          subtotal: 800000,
        },
      ],
      subtotal: 800000,
      shippingCost: 0,
      total: 800000,
      paymentMethod: "cash",
      shippingMethod: "pickup",
      shippingAddress: {
        street: "Calle Falsa 123",
        city: "San Isidro",
        province: "Buenos Aires",
        zipCode: "1642",
      },
    });

    const invoice = await Invoice.create({
      order: order._id,
      invoiceNumber: "0001-00000001",
      pointOfSale: 1,
      cuit: "20345678901",
      taxCondition: "monotributo",
      items: [{ description: "Sustrato Premium x1", quantity: 1, unitPrice: 800000, subtotal: 800000 }],
      subtotal: 800000,
      total: 800000,
    });

    expect(invoice.status).toBe("draft");
    expect(invoice.invoiceType).toBe("C");
  });
});
