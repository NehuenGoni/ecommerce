import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../validators/auth.validators.js";

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

// TODO: /forgot-password y /reset-password, una vez integrado Resend para
// el envío del email de recuperación.
