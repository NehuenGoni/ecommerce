import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddressForm } from "../AddressForm";

describe("AddressForm", () => {
  it("llama a onSubmit con los valores cargados", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddressForm submitLabel="Agregar dirección" onSubmit={onSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText("Etiqueta (ej. Casa, Trabajo)"), {
      target: { value: "Casa" },
    });
    fireEvent.change(screen.getByPlaceholderText("Calle y número"), {
      target: { value: "Calle Falsa 123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ciudad"), { target: { value: "San Isidro" } });
    fireEvent.change(screen.getByPlaceholderText("Provincia"), { target: { value: "Buenos Aires" } });
    fireEvent.change(screen.getByPlaceholderText("Código postal"), { target: { value: "1642" } });
    fireEvent.click(screen.getByText("Usar como dirección predeterminada"));

    fireEvent.click(screen.getByRole("button", { name: "Agregar dirección" }));

    expect(onSubmit).toHaveBeenCalledWith({
      label: "Casa",
      street: "Calle Falsa 123",
      city: "San Isidro",
      province: "Buenos Aires",
      zipCode: "1642",
      isDefault: true,
    });
  });

  it("precarga los valores de una dirección existente", () => {
    render(
      <AddressForm
        initial={{
          _id: "addr-1",
          label: "Trabajo",
          street: "Av. Siempre Viva 742",
          city: "Vicente López",
          province: "Buenos Aires",
          zipCode: "1638",
          isDefault: false,
        }}
        submitLabel="Guardar cambios"
        onSubmit={vi.fn()}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByDisplayValue("Trabajo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Av. Siempre Viva 742")).toBeInTheDocument();
  });

  it("llama a onCancel al hacer click en Cancelar", () => {
    const onCancel = vi.fn();
    render(<AddressForm submitLabel="Agregar dirección" onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalled();
  });
});
