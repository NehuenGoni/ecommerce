import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

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

  // TODO: montar routers de auth, products, categories, orders, etc. a medida
  // que se implementan los módulos correspondientes.

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}
