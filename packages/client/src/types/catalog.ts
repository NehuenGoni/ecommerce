import type { Category, Product } from "@growshop/shared";

/**
 * Los endpoints de listado/detalle de productos populan `category` con
 * {_id, name, slug} en vez de dejarla como ID crudo (a diferencia del tipo
 * `Product` "de dominio" en @growshop/shared). Este tipo refleja la forma
 * real que devuelve la API.
 */
export type CategoryRef = Pick<Category, "_id" | "name" | "slug">;

export interface ProductListItem extends Omit<Product, "category"> {
  category: CategoryRef;
}
