import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";
import slugify from "slugify";

export interface CategoryDocument {
  name: string;
  slug: string;
  description: string;
  image: string;
  parent: Types.ObjectId | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export type CategoryHydratedDocument = HydratedDocument<CategoryDocument>;

export const Category = mongoose.model<CategoryDocument>("Category", categorySchema);
