import { Router } from "express";
import { getMovements, getStock } from "../controllers/inventory.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { movementQuerySchema, stockQuerySchema } from "../validators/inventory.validators.js";

export const inventoryRouter: Router = Router();

inventoryRouter.use(authenticate, requireRole("admin"));

inventoryRouter.get("/stock", validateQuery(stockQuerySchema), getStock);
inventoryRouter.get("/movements", validateQuery(movementQuerySchema), getMovements);
