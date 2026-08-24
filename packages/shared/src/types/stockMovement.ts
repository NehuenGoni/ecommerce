import type { ID } from "./common.js";

export type StockMovementType = "purchase_in" | "sale_out" | "adjustment" | "return";

export interface StockMovement {
  _id: ID;
  product: ID;
  variantSku: string;
  type: StockMovementType;
  /** Positivo = entrada, negativo = salida */
  quantity: number;
  previousStock: number;
  newStock: number;
  /** ID de orden o compra relacionada */
  reference: string;
  note: string;
  createdBy: ID;
  createdAt: string;
}
