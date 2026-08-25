import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import App from "./App";

function renderApp(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("renderiza el header con el nombre de la marca", () => {
    renderApp();
    expect(screen.getAllByText("Growshop").length).toBeGreaterThan(0);
  });

  it("renderiza la home en la ruta raíz", () => {
    renderApp(["/"]);
    expect(screen.getByRole("heading", { name: /insumos de cultivo/i })).toBeInTheDocument();
  });

  it("renderiza la página 404 en una ruta desconocida", () => {
    renderApp(["/esto-no-existe"]);
    expect(screen.getByText(/esta página todavía no existe/i)).toBeInTheDocument();
  });

  it("renderiza el footer", () => {
    renderApp();
    expect(screen.getByText(/todos los derechos reservados/i)).toBeInTheDocument();
  });
});
