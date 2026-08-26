import { Router } from "express";
import {
  addAddress,
  removeAddress,
  updateAddress,
  updateProfile,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { addressInputSchema, updateProfileSchema } from "../validators/user.validators.js";

export const userRouter: Router = Router();

userRouter.use(authenticate);

// GET /api/auth/me ya devuelve el perfil completo; acá solo las mutaciones.
userRouter.patch("/me", validateBody(updateProfileSchema), updateProfile);
userRouter.post("/me/addresses", validateBody(addressInputSchema), addAddress);
userRouter.patch("/me/addresses/:addressId", validateBody(addressInputSchema), updateAddress);
userRouter.delete("/me/addresses/:addressId", removeAddress);
