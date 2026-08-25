import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";
import slugify from "slugify";

export type ImageSource = "cloudinary" | "external";

export interface ProductImage {
  url: string;
  source: ImageSource;
  alt: string;
  order: number;
}

export interface ProductVariant {
  sku: string;
  name: string;
  /** Precio de venta, en centavos (ARS) */
  price: number;
  /** Precio de compra al proveedor, en centavos. Solo se expone en admin. */
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  weight: number;
  barcode?: string;
}

export interface ProductDocument {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: Types.ObjectId;
  brand: string;
  variants: ProductVariant[];
  images: ProductImage[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<ProductImage>(
  {
    url: { type: String, required: true },
    source: { type: String, enum: ["cloudinary", "external"], required: true },
    alt: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const productVariantSchema = new Schema<ProductVariant>(
  {
    sku: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    weight: { type: Number, required: true, min: 0 },
    barcode: { type: String },
  },
  { _id: false },
);

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: String, default: "" },
    variants: {
      type: [productVariantSchema],
      validate: {
        validator: (variants: ProductVariant[]) => variants.length > 0,
        message: "El producto necesita al menos una variante",
      },
    },
    images: { type: [productImageSchema], default: [] },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.index({ "variants.sku": 1 }, { unique: true });
productSchema.index(
  { name: "text", shortDescription: "text", brand: "text", tags: "text" },
  { default_language: "spanish" },
);

productSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export type ProductHydratedDocument = HydratedDocument<ProductDocument>;

export const Product = mongoose.model<ProductDocument>("Product", productSchema);
