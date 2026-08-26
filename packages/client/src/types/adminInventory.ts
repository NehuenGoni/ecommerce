import type { StockMovement, StockMovementType } from "@growshop/shared";

export interface StockRow {
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  variantName: string;
  stock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  price: number;
  costPrice: number;
}

export interface AdminStockMovement extends Omit<StockMovement, "product"> {
  product: { _id: string; name: string; slug: string } | null;
}

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  purchase_in: "Ingreso por compra",
  sale_out: "Salida por venta",
  adjustment: "Ajuste",
  return: "Devolución",
};
