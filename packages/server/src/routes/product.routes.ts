import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/product.controller.js";
import { authenticate, optionalAuthenticate, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from "../validators/product.validators.js";

export const productRouter: Router = Router();

productRouter.get("/", optionalAuthenticate, validateQuery(productQuerySchema), listProducts);
productRouter.get("/:idOrSlug", optionalAuthenticate, getProduct);
productRouter.post(
  "/",
  authenticate,
  requireRole("admin"),
  validateBody(createProductSchema),
  createProduct,
);
productRouter.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  validateBody(updateProductSchema),
  updateProduct,
);
productRouter.delete("/:id", authenticate, requireRole("admin"), deleteProduct);
