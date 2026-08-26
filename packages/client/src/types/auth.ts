import type { Address } from "@growshop/shared";

/** Una dirección guardada trae _id (a diferencia del Address embebido como snapshot en un pedido). */
export interface SavedAddress extends Address {
  _id: string;
}

export interface AuthUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "customer" | "admin";
  addresses: SavedAddress[];
  isActive: boolean;
}
