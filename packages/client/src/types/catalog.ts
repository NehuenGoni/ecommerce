import type { Category, Product, Supplier } from "@growshop/shared";

/**
 * Los endpoints de listado/detalle de productos populan `category` con
 * {_id, name, slug} en vez de dejarla como ID crudo (a diferencia del tipo
 * `Product` "de dominio" en @growshop/shared). Este tipo refleja la forma
 * real que devuelve la API.
 */
export type CategoryRef = Pick<Category, "_id" | "name" | "slug">;

/** `supplier` viene poblado con {_id, name}, y está ausente (no null) cuando quien pide no es admin. */
export type SupplierRef = Pick<Supplier, "_id" | "name">;

export interface ProductListItem extends Omit<Product, "category" | "supplier"> {
  category: CategoryRef;
  supplier?: SupplierRef | null;
}
