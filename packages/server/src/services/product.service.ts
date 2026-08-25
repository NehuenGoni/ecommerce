import mongoose, { type PipelineStage } from "mongoose";
import { Category } from "../models/Category.js";
import { Order } from "../models/Order.js";
import { Product, type ProductDocument, type ProductVariant } from "../models/Product.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import type {
  CreateProductInput,
  ProductQuery,
  UpdateProductInput,
} from "../validators/product.validators.js";

async function resolveCategoryFilter(category: string): Promise<mongoose.Types.ObjectId | null> {
  if (mongoose.isValidObjectId(category)) {
    return new mongoose.Types.ObjectId(category);
  }
  const found = await Category.findOne({ slug: category }).select("_id");
  return found?._id ?? null;
}

export interface ProductListResult {
  items: ProductDocument[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function listProducts(
  query: ProductQuery,
  includeInactive: boolean,
): Promise<ProductListResult> {
  const match: Record<string, unknown> = {};
  if (!includeInactive) match.isActive = true;
  if (query.brand) match.brand = query.brand;
  if (query.isFeatured !== undefined) match.isFeatured = query.isFeatured;
  if (query.tags) {
    match.tags = { $in: query.tags.split(",").map((tag) => tag.trim()) };
  }
  if (query.category) {
    const categoryId = await resolveCategoryFilter(query.category);
    // categoría inexistente: forzamos un ObjectId que no matchea nada, en vez
    // de devolver el catálogo completo
    match.category = categoryId ?? new mongoose.Types.ObjectId();
  }
  if (query.q) {
    match.$text = { $search: query.q };
  }

  const pipeline: PipelineStage[] = [{ $match: match }];

  if (query.q) {
    pipeline.push({ $addFields: { score: { $meta: "textScore" } } });
  }

  // El precio vive en cada variante; usamos el mínimo del producto tanto
  // para el filtro de rango como para el ordenamiento por precio.
  pipeline.push({ $addFields: { minPrice: { $min: "$variants.price" } } });

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const priceMatch: Record<string, number> = {};
    if (query.minPrice !== undefined) priceMatch.$gte = query.minPrice;
    if (query.maxPrice !== undefined) priceMatch.$lte = query.maxPrice;
    pipeline.push({ $match: { minPrice: priceMatch } });
  }

  const sortStage: Record<string, 1 | -1 | { $meta: "textScore" }> =
    query.q && query.sort === "newest"
      ? { score: { $meta: "textScore" } }
      : {
          newest: { createdAt: -1 as const },
          price_asc: { minPrice: 1 as const },
          price_desc: { minPrice: -1 as const },
          name_asc: { name: 1 as const },
        }[query.sort];

  const skip = (query.page - 1) * query.limit;

  pipeline.push({
    $facet: {
      items: [{ $sort: sortStage }, { $skip: skip }, { $limit: query.limit }],
      totalCount: [{ $count: "count" }],
    },
  });

  const [result] = await Product.aggregate<{
    items: ProductDocument[];
    totalCount: [{ count: number }] | [];
  }>(pipeline);

  const items = result?.items ?? [];
  const total = result?.totalCount[0]?.count ?? 0;

  await Product.populate(items, { path: "category", select: "name slug" });

  return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}

export async function getProductByIdOrSlug(idOrSlug: string, includeInactive: boolean) {
  const filter: mongoose.FilterQuery<ProductDocument> = mongoose.isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };
  if (!includeInactive) {
    filter.isActive = true;
  }

  const product = await Product.findOne(filter).populate("category", "name slug");
  if (!product) {
    throw new NotFoundError("Producto no encontrado");
  }
  return product;
}

export async function createProduct(input: CreateProductInput) {
  const category = await Category.findById(input.category);
  if (!category) {
    throw new NotFoundError("Categoría no encontrada");
  }
  return Product.create(input);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await Product.findById(id);
  if (!product) {
    throw new NotFoundError("Producto no encontrado");
  }

  if (input.category) {
    const category = await Category.findById(input.category);
    if (!category) {
      throw new NotFoundError("Categoría no encontrada");
    }
  }

  const { variants: incomingVariants, ...rest } = input;
  Object.assign(product, rest);

  if (incomingVariants) {
    const existingBySku = new Map(product.variants.map((v) => [v.sku, v]));
    product.variants = incomingVariants.map(
      (variant): ProductVariant => ({
        ...variant,
        stock: existingBySku.get(variant.sku)?.stock ?? 0,
      }),
    );
  }

  await product.save();
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await Product.findById(id);
  if (!product) {
    throw new NotFoundError("Producto no encontrado");
  }

  const hasOrders = await Order.exists({ "items.product": id });
  if (hasOrders) {
    throw new ConflictError(
      "No se puede eliminar: tiene pedidos asociados. Desactivalo en su lugar.",
    );
  }

  await product.deleteOne();
}
