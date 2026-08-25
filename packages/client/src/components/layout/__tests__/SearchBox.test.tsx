import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { SearchBox } from "../SearchBox";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

function renderSearchBox() {
  return render(
    <MemoryRouter>
      <SearchBox />
    </MemoryRouter>,
  );
}

describe("SearchBox", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("espera a que el usuario deje de tipear antes de buscar (debounced)", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      items: [
        {
          _id: "1",
          name: "Fertilizante Orgánico",
          slug: "fertilizante-organico",
          variants: [
            { sku: "A", name: "1L", price: 100000, costPrice: 50000, stock: 5, lowStockThreshold: 5, weight: 1 },
          ],
        },
      ],
    });

    renderSearchBox();
    const input = screen.getByPlaceholderText("Buscar productos...");
    fireEvent.change(input, { target: { value: "fert" } });

    // no debería buscar de inmediato, tecla por tecla
    expect(apiFetch).not.toHaveBeenCalled();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining("q=fert"));
    await waitFor(() => expect(screen.getByText("Fertilizante Orgánico")).toBeInTheDocument());
  });

  it("muestra 'sin resultados' cuando la búsqueda no encuentra nada", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ items: [] });

    renderSearchBox();
    fireEvent.change(screen.getByPlaceholderText("Buscar productos..."), { target: { value: "xyz" } });

    await waitFor(() => expect(screen.getByText(/sin resultados/i)).toBeInTheDocument());
  });

  it("no busca si el campo queda vacío", async () => {
    renderSearchBox();
    const input = screen.getByPlaceholderText("Buscar productos...");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "" } });

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
