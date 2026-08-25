import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from "../controllers/category.controller.js";
import { authenticate, optionalAuthenticate, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  categoryQuerySchema,
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from "../validators/category.validators.js";

export const categoryRouter: Router = Router();

categoryRouter.get("/", optionalAuthenticate, validateQuery(categoryQuerySchema), listCategories);

// Ruta literal antes que la param route ("/:idOrSlug"), o "reorder" matchearía como slug.
categoryRouter.patch(
  "/reorder",
  authenticate,
  requireRole("admin"),
  validateBody(reorderCategoriesSchema),
  reorderCategories,
);

categoryRouter.get("/:idOrSlug", optionalAuthenticate, getCategory);
categoryRouter.post(
  "/",
  authenticate,
  requireRole("admin"),
  validateBody(createCategorySchema),
  createCategory,
);
categoryRouter.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  validateBody(updateCategorySchema),
  updateCategory,
);
categoryRouter.delete("/:id", authenticate, requireRole("admin"), deleteCategory);
