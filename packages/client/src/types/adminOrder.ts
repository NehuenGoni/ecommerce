import type { Order } from "@growshop/shared";

export interface AdminOrderCustomer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** El endpoint de admin popula `customer` en vez de dejarlo como ID crudo. */
export interface AdminOrder extends Omit<Order, "customer"> {
  customer: AdminOrderCustomer;
}
