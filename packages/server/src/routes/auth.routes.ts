import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import {
  acceptInvite,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resetPassword,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { acceptInviteSchema } from "../validators/admin.validators.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/auth.validators.js";

// Límite estricto para frenar fuerza bruta sobre login/registro. Relajado en
// test: el store del limiter es un singleton de módulo (correcto para un
// proceso de producción real), así que persiste entre tests del mismo run.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
});

export const authRouter: Router = Router();

authRouter.post("/register", authLimiter, validateBody(registerSchema), register);
authRouter.post("/login", authLimiter, validateBody(loginSchema), login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", authenticate, me);

authRouter.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  forgotPassword,
);
authRouter.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), resetPassword);
authRouter.post("/accept-invite", authLimiter, validateBody(acceptInviteSchema), acceptInvite);
