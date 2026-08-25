import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renderiza el header con el nombre de la marca", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("Growshop").length).toBeGreaterThan(0);
  });

  it("renderiza la home en la ruta raíz", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /insumos de cultivo/i })).toBeInTheDocument();
  });

  it("renderiza la página 404 en una ruta desconocida", () => {
    render(
      <MemoryRouter initialEntries={["/esto-no-existe"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText(/esta página todavía no existe/i)).toBeInTheDocument();
  });

  it("renderiza el footer", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText(/todos los derechos reservados/i)).toBeInTheDocument();
  });
});
