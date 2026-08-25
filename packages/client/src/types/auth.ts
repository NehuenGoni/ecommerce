import type { Address } from "@growshop/shared";

export interface AuthUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "customer" | "admin";
  addresses: Address[];
  isActive: boolean;
}
