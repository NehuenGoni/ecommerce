import { Router } from "express";
import { getCloudinarySignature } from "../controllers/upload.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export const uploadRouter: Router = Router();

uploadRouter.post(
  "/cloudinary-signature",
  authenticate,
  requireRole("admin"),
  getCloudinarySignature,
);
