import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { mercadoPagoWebhook } from "./controllers/checkout.controller.js";
import { authRouter } from "./routes/auth.routes.js";
import { cartRouter } from "./routes/cart.routes.js";
import { categoryRouter } from "./routes/category.routes.js";
import { checkoutRouter } from "./routes/checkout.routes.js";
import { inventoryRouter } from "./routes/inventory.routes.js";
import { orderRouter } from "./routes/order.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { supplierPurchaseRouter } from "./routes/supplierPurchase.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { AppError } from "./utils/errors.js";

export function createApp(clientUrl: string): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: clientUrl,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  // Ver comentario en checkout.routes.ts: mongoSanitize() eliminaría el
  // querystring "data.id" que Mercado Pago manda a este webhook.
  app.post("/api/checkout/mercadopago/webhook", mercadoPagoWebhook);

  app.use(mongoSanitize());

  // Rate limit general de la API. Los endpoints de auth y checkout
  // llevan límites más estrictos definidos junto a esas rutas.
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoryRouter);
  app.use("/api/products", productRouter);
  app.use("/api/uploads", uploadRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/checkout", checkoutRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/supplier-purchases", supplierPurchaseRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    if (err.name === "ValidationError") {
      res.status(400).json({ error: err.message });
      return;
    }
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: "Ya existe un registro con esos datos" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}
