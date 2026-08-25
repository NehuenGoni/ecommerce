import { Router } from "express";
import { getCloudinarySignature } from "../controllers/upload.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { uploadSignatureSchema } from "../validators/upload.validators.js";

export const uploadRouter: Router = Router();

// La restricción por rol (imágenes de producto = admin, comprobantes =
// cualquier usuario autenticado) se resuelve dentro del controller según el
// "context" del body, porque depende de un valor recién validado, no del rol.
uploadRouter.post(
  "/cloudinary-signature",
  authenticate,
  validateBody(uploadSignatureSchema),
  getCloudinarySignature,
);
