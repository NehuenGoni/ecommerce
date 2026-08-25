import mongoose from "mongoose";
import { Category, type CategoryDocument } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import type {
  CategoryQuery,
  CreateCategoryInput,
  ReorderCategoriesInput,
  UpdateCategoryInput,
} from "../validators/category.validators.js";

export async function listCategories(query: CategoryQuery, includeInactive: boolean) {
  const filter: mongoose.FilterQuery<CategoryDocument> = {};
  if (!includeInactive && !query.includeInactive) {
    filter.isActive = true;
  }
  if (query.parent === "null") {
    filter.parent = null;
  } else if (query.parent) {
    filter.parent = query.parent;
  }

  return Category.find(filter).sort({ order: 1, name: 1 });
}

export async function getCategoryByIdOrSlug(idOrSlug: string, includeInactive: boolean) {
  const filter: mongoose.FilterQuery<CategoryDocument> = mongoose.isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };
  if (!includeInactive) {
    filter.isActive = true;
  }

  const category = await Category.findOne(filter);
  if (!category) {
    throw new NotFoundError("Categoría no encontrada");
  }
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  return Category.create(input);
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const category = await Category.findById(id);
  if (!category) {
    throw new NotFoundError("Categoría no encontrada");
  }
  Object.assign(category, input);
  await category.save();
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await Category.findById(id);
  if (!category) {
    throw new NotFoundError("Categoría no encontrada");
  }

  const [hasChildren, hasProducts] = await Promise.all([
    Category.exists({ parent: id }),
    Product.exists({ category: id }),
  ]);

  if (hasChildren) {
    throw new ConflictError("No se puede eliminar: tiene subcategorías asociadas");
  }
  if (hasProducts) {
    throw new ConflictError(
      "No se puede eliminar: tiene productos asociados. Desactivala en su lugar.",
    );
  }

  await category.deleteOne();
}

export async function reorderCategories(items: ReorderCategoriesInput["items"]): Promise<void> {
  await Category.bulkWrite(
    items.map(({ id, order }) => ({
      updateOne: { filter: { _id: id }, update: { order } },
    })),
  );
}
