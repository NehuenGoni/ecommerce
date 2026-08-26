import type { OrderStatusHistoryEntry } from "@growshop/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderStatusTimeline } from "../OrderStatusTimeline";

const history: OrderStatusHistoryEntry[] = [
  { status: "pending", timestamp: "2026-01-01T10:00:00.000Z", note: "Pedido creado", updatedBy: "user-1" },
  { status: "confirmed", timestamp: "2026-01-02T10:00:00.000Z", note: "Pago verificado", updatedBy: "admin-1" },
];

describe("OrderStatusTimeline", () => {
  it("renderiza cada entrada del historial con su nota", () => {
    render(<OrderStatusTimeline history={history} />);

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.getByText("Pedido creado")).toBeInTheDocument();
    expect(screen.getByText("Pago verificado")).toBeInTheDocument();
  });

  it("no renderiza nada si el historial está vacío", () => {
    const { container } = render(<OrderStatusTimeline history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
