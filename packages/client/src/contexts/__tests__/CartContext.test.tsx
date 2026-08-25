import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { apiFetch } from "@/lib/api";
import type { ProductListItem } from "@/types/catalog";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

type ApiFetchOptions = RequestInit & { accessToken?: string };

const fixtureProduct: ProductListItem = {
  _id: "prod-1",
  name: "Fertilizante",
  slug: "fertilizante",
  description: "",
  shortDescription: "",
  category: { _id: "cat-1", name: "Fertilizantes", slug: "fertilizantes" },
  brand: "",
  variants: [
    { sku: "SKU-1", name: "1L", price: 100000, costPrice: 50000, stock: 10, lowStockThreshold: 5, weight: 1 },
  ],
  images: [],
  tags: [],
  isActive: true,
  isFeatured: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function Harness() {
  const auth = useAuth();
  const cart = useCart();
  return (
    <div>
      <button onClick={() => void cart.addItem(fixtureProduct, fixtureProduct.variants[0]!, 2)}>add</button>
      <button onClick={() => void cart.setQuantity("prod-1", "SKU-1", 5)}>set5</button>
      <button onClick={() => void cart.removeItem("prod-1", "SKU-1")}>remove</button>
      <button onClick={() => void auth.login("a@b.com", "password123")}>login</button>
      <div data-testid="user">{auth.user?.email ?? "none"}</div>
      <div data-testid="loading">{String(cart.loading)}</div>
      <div data-testid="count">{cart.itemCount}</div>
      <div data-testid="subtotal">{cart.subtotal}</div>
    </div>
  );
}

function renderHarness() {
  return render(
    <AuthProvider>
      <CartProvider>
        <Harness />
      </CartProvider>
    </AuthProvider>,
  );
}

describe("CartContext (anónimo, localStorage)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockImplementation((path: string, _options?: ApiFetchOptions) => {
      if (path === "/auth/refresh") return Promise.reject(new Error("no session"));
      if (path.startsWith("/products/prod-1")) return Promise.resolve({ product: fixtureProduct });
      return Promise.reject(new Error(`unhandled path in test: ${path}`));
    });
  });

  it("agrega un item, lo refleja en el estado y lo persiste en localStorage", async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    screen.getByText("add").click();

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));
    expect(screen.getByTestId("subtotal")).toHaveTextContent("200000");

    const stored = JSON.parse(localStorage.getItem("growshop-cart") ?? "[]");
    expect(stored).toEqual([{ productId: "prod-1", variantSku: "SKU-1", quantity: 2 }]);
  });

  it("actualiza la cantidad de un item existente", async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    screen.getByText("add").click();
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));

    screen.getByText("set5").click();
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("5"));
  });

  it("elimina un item al removerlo, y lo saca de localStorage", async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    screen.getByText("add").click();
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));

    screen.getByText("remove").click();
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    expect(JSON.parse(localStorage.getItem("growshop-cart") ?? "[]")).toEqual([]);
  });
});

describe("CartContext (sincronización al loguearse)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "growshop-cart",
      JSON.stringify([{ productId: "prod-1", variantSku: "SKU-1", quantity: 3 }]),
    );
    vi.mocked(apiFetch).mockReset();
  });

  it("manda el carrito local al backend con PUT /cart y limpia localStorage", async () => {
    vi.mocked(apiFetch).mockImplementation((path: string, options?: ApiFetchOptions) => {
      if (path === "/auth/refresh") return Promise.reject(new Error("no session"));
      if (path === "/auth/login") {
        return Promise.resolve({
          user: {
            _id: "user-1",
            email: "a@b.com",
            firstName: "A",
            lastName: "B",
            phone: "",
            role: "customer",
            addresses: [],
            isActive: true,
          },
          accessToken: "token-abc",
        });
      }
      if (path === "/cart" && options?.method === "PUT") {
        return Promise.resolve({
          items: [
            {
              product: { id: "prod-1", name: "Fertilizante", slug: "fertilizante", image: null },
              variant: fixtureProduct.variants[0],
              quantity: 3,
              subtotal: 300000,
              available: true,
            },
          ],
          subtotal: 300000,
          adjustments: [],
        });
      }
      return Promise.reject(new Error(`unhandled path in test: ${path} ${options?.method ?? "GET"}`));
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    screen.getByText("login").click();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("a@b.com"));
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("3"));

    const putCall = vi
      .mocked(apiFetch)
      .mock.calls.find(([path, options]) => path === "/cart" && (options as ApiFetchOptions | undefined)?.method === "PUT");
    expect(putCall).toBeDefined();
    expect(JSON.parse((putCall![1] as ApiFetchOptions).body as string)).toEqual({
      items: [{ productId: "prod-1", variantSku: "SKU-1", quantity: 3 }],
    });

    expect(localStorage.getItem("growshop-cart")).toBe("[]");
  });
});
