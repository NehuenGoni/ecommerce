import type { Address, ID, Timestamps } from "./common.js";

export type UserRole = "customer" | "admin";

export interface User extends Timestamps {
  _id: ID;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  addresses: Address[];
  isActive: boolean;
}

/** User sin campos sensibles, seguro para exponer al cliente */
export type PublicUser = User;
