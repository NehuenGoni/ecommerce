import { Router } from "express";
import {
  createPurchase,
  getPurchase,
  listPurchases,
} from "../controllers/supplierPurchase.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { createPurchaseSchema, purchaseQuerySchema } from "../validators/supplierPurchase.validators.js";

export const supplierPurchaseRouter: Router = Router();

supplierPurchaseRouter.use(authenticate, requireRole("admin"));

supplierPurchaseRouter.get("/", validateQuery(purchaseQuerySchema), listPurchases);
supplierPurchaseRouter.get("/:id", getPurchase);
supplierPurchaseRouter.post("/", validateBody(createPurchaseSchema), createPurchase);
