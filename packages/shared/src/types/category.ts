import type { ID, Timestamps } from "./common.js";

export interface Category extends Timestamps {
  _id: ID;
  name: string;
  slug: string;
  description: string;
  image: string;
  parent: ID | null;
  order: number;
  isActive: boolean;
}
