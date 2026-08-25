import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./routes/auth.routes.js";
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

  // TODO: montar routers de products, categories, orders, inventario, etc. a
  // medida que se implementan los módulos correspondientes.

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
