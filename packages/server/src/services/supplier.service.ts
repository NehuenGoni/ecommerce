import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Supplier, type SupplierDocument } from "../models/Supplier.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import type {
  CreateSupplierInput,
  SupplierQuery,
  UpdateSupplierInput,
} from "../validators/supplier.validators.js";

export async function listSuppliers(query: SupplierQuery) {
  const filter: mongoose.FilterQuery<SupplierDocument> = {};
  if (!query.includeInactive) {
    filter.isActive = true;
  }

  return Supplier.find(filter).sort({ name: 1 });
}

export async function getSupplierById(id: string) {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throw new NotFoundError("Proveedor no encontrado");
  }
  return supplier;
}

export async function createSupplier(input: CreateSupplierInput) {
  return Supplier.create(input);
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throw new NotFoundError("Proveedor no encontrado");
  }
  Object.assign(supplier, input);
  await supplier.save();
  return supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throw new NotFoundError("Proveedor no encontrado");
  }

  const hasProducts = await Product.exists({ supplier: id });
  if (hasProducts) {
    throw new ConflictError(
      "No se puede eliminar: tiene productos asociados. Desactivalo en su lugar.",
    );
  }

  await supplier.deleteOne();
}
