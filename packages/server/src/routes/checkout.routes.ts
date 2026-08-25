import { Router } from "express";
import { postCheckout } from "../controllers/checkout.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { checkoutSchema } from "../validators/checkout.validators.js";

export const checkoutRouter: Router = Router();

checkoutRouter.post("/", authenticate, validateBody(checkoutSchema), postCheckout);

// El webhook de Mercado Pago (POST /api/checkout/mercadopago/webhook) se
// monta aparte, directo en app.ts y antes de mongoSanitize(): MP manda el
// payment id como querystring "data.id" (con punto, por contrato de su API),
// y mongoSanitize elimina por defecto cualquier key de query que contenga un
// punto. Montarlo acá lo perdería silenciosamente.
