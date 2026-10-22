import { Router } from "express";
import { getSettings, updatePricing } from "../controllers/settings.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { updatePricingSettingsSchema } from "../validators/settings.validators.js";

export const settingsRouter: Router = Router();

// La configuración del negocio es interna: lectura y escritura solo para admin.
settingsRouter.use(authenticate, requireRole("admin"));

settingsRouter.get("/", getSettings);
settingsRouter.put("/pricing", validateBody(updatePricingSettingsSchema), updatePricing);
