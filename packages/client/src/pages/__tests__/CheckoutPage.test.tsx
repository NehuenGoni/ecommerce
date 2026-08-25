import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { apiFetch } from "@/lib/api";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { LoginPage } from "@/pages/LoginPage";

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

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={["/checkout"]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("redirige a /login si no hay sesión iniciada", async () => {
    vi.mocked(apiFetch).mockImplementation((path: string) => {
      if (path === "/auth/refresh") return Promise.reject(new Error("no session"));
      return Promise.reject(new Error(`unhandled path in test: ${path}`));
    });

    renderCheckout();

    await waitFor(() => expect(screen.getByText("Iniciar sesión")).toBeInTheDocument());
  });

  it("deshabilita efectivo cuando se elige Mercado Envíos", async () => {
    vi.mocked(apiFetch).mockImplementation((path: string, options?: ApiFetchOptions) => {
      if (path === "/auth/refresh") {
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
      if (path === "/cart" && !options?.method) {
        return Promise.resolve({
          items: [
            {
              product: { id: "prod-1", name: "Fertilizante", slug: "fertilizante", image: null },
              variant: {
                sku: "SKU-1",
                name: "1L",
                price: 100000,
                costPrice: 50000,
                stock: 10,
                lowStockThreshold: 5,
                weight: 1,
              },
              quantity: 1,
              subtotal: 100000,
              available: true,
            },
          ],
          subtotal: 100000,
        });
      }
      return Promise.reject(new Error(`unhandled path in test: ${path}`));
    });

    renderCheckout();

    await waitFor(() => expect(screen.getByText("Finalizar compra")).toBeInTheDocument());

    const cashRadio = screen.getByRole("radio", { name: /efectivo en entrega\/retiro/i });
    const mercadoEnviosRadio = screen.getByRole("radio", { name: /mercado envíos/i });

    expect(cashRadio).not.toBeDisabled();

    mercadoEnviosRadio.click();

    await waitFor(() => expect(cashRadio).toBeDisabled());
    expect(screen.getByText(/solo está disponible con envío en moto o retiro/i)).toBeInTheDocument();
  });
});
