import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI es requerido"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET es requerido"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET es requerido"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  MP_ACCESS_TOKEN: z.string().optional().default(""),
  MP_PUBLIC_KEY: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  /** URL pública del server, usada para el webhook de Mercado Pago. Vacío en dev. */
  SERVER_URL: z.string().optional().default(""),
  /** Sin API key, la extracción de facturas queda deshabilitada (no-op), igual que Resend. */
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().optional().default("claude-sonnet-5"),
  ANTHROPIC_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).optional().default("medium"),
  /** Margen por defecto (%) para calcular el precio de venta a partir del costo de una factura importada. */
  DEFAULT_MARGIN_PCT: z.coerce.number().min(0).optional().default(60),
  /** Paso de redondeo hacia arriba para precios calculados, en centavos ($100 = 10000). */
  PRICE_ROUNDING_STEP: z.coerce.number().int().min(1).optional().default(10000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variables de entorno inválidas:\n${issues}`);
  }
  return parsed.data;
}

/** Singleton validado al importar el módulo, para uso en servicios/middleware. */
export const env = loadEnv();
