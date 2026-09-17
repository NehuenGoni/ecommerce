import type { ID, Timestamps } from "./common.js";

export interface Supplier extends Timestamps {
  _id: ID;
  name: string;
  taxId: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
}
