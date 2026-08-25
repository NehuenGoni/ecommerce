import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ProductListItem } from "@/types/catalog";
import { ProductCard } from "../ProductCard";

function buildProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    _id: "prod-1",
    name: "Fertilizante Orgánico Premium",
    slug: "fertilizante-organico-premium",
    description: "",
    shortDescription: "",
    category: { _id: "cat-1", name: "Fertilizantes", slug: "fertilizantes" },
    brand: "Growshop",
    variants: [
      {
        sku: "SKU-1",
        name: "1 Litro",
        price: 425000,
        costPrice: 250000,
        stock: 10,
        lowStockThreshold: 5,
        weight: 1,
      },
    ],
    images: [],
    tags: [],
    isActive: true,
    isFeatured: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderCard(product: ProductListItem) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>,
  );
}

describe("ProductCard", () => {
  it("muestra el nombre, la marca y el precio formateado", () => {
    renderCard(buildProduct());

    expect(screen.getByText("Fertilizante Orgánico Premium")).toBeInTheDocument();
    expect(screen.getByText("Growshop")).toBeInTheDocument();
    expect(screen.getByText("$4.250")).toBeInTheDocument();
  });

  it("usa la variante más barata cuando hay varias", () => {
    renderCard(
      buildProduct({
        variants: [
          { sku: "A", name: "5L", price: 900000, costPrice: 500000, stock: 5, lowStockThreshold: 5, weight: 5 },
          { sku: "B", name: "1L", price: 200000, costPrice: 100000, stock: 5, lowStockThreshold: 5, weight: 1 },
        ],
      }),
    );

    expect(screen.getByText("$2.000")).toBeInTheDocument();
  });

  it("muestra 'Últimas unidades' cuando el stock está en o por debajo del umbral", () => {
    renderCard(
      buildProduct({
        variants: [
          { sku: "A", name: "1L", price: 100000, costPrice: 50000, stock: 3, lowStockThreshold: 5, weight: 1 },
        ],
      }),
    );

    expect(screen.getByText("Últimas unidades")).toBeInTheDocument();
  });

  it("muestra 'Sin stock' cuando el stock es cero", () => {
    renderCard(
      buildProduct({
        variants: [
          { sku: "A", name: "1L", price: 100000, costPrice: 50000, stock: 0, lowStockThreshold: 5, weight: 1 },
        ],
      }),
    );

    expect(screen.getByText("Sin stock")).toBeInTheDocument();
  });

  it("enlaza a la página de detalle del producto", () => {
    renderCard(buildProduct());
    expect(screen.getByRole("link")).toHaveAttribute("href", "/productos/fertilizante-organico-premium");
  });
});
