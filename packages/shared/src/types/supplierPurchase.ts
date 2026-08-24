import type { ID, Timestamps } from "./common.js";

export interface SupplierPurchaseItem {
  product: ID;
  /** SKU de la variante comprada */
  variant: string;
  quantity: number;
  /** Costo unitario en centavos */
  unitCost: number;
  /** unitCost * quantity, en centavos */
  totalCost: number;
}

export interface SupplierPurchase extends Timestamps {
  _id: ID;
  supplier: string;
  items: SupplierPurchaseItem[];
  purchaseDate: string;
  notes: string;
  createdBy: ID;
}
