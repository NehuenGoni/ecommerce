import { Router } from "express";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from "../controllers/supplier.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  createSupplierSchema,
  supplierQuerySchema,
  updateSupplierSchema,
} from "../validators/supplier.validators.js";

export const supplierRouter: Router = Router();

// Los proveedores son un dato 100% interno de administración: toda la
// entidad (incluida la lectura) requiere rol admin.
supplierRouter.use(authenticate, requireRole("admin"));

supplierRouter.get("/", validateQuery(supplierQuerySchema), listSuppliers);
supplierRouter.get("/:id", getSupplier);
supplierRouter.post("/", validateBody(createSupplierSchema), createSupplier);
supplierRouter.patch("/:id", validateBody(updateSupplierSchema), updateSupplier);
supplierRouter.delete("/:id", deleteSupplier);
