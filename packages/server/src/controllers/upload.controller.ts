import type { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ForbiddenError } from "../utils/errors.js";
import type { UploadContext } from "../validators/upload.validators.js";

const FOLDER_BY_CONTEXT: Record<UploadContext, string> = {
  products: "growshop/products",
  receipts: "growshop/receipts",
};

/**
 * El navegador sube el archivo directamente a Cloudinary (no pasa por
 * nuestro servidor). Acá solo generamos la firma con el api_secret, que
 * nunca se expone al frontend. Imágenes de producto: solo admin. Comprobantes
 * de transferencia: cualquier usuario autenticado, para su propio pedido.
 */
export const getCloudinarySignature = asyncHandler(async (req: Request, res: Response) => {
  const { context } = req.body as { context: UploadContext };

  if (context === "products" && req.user?.role !== "admin") {
    throw new ForbiddenError();
  }

  const folder = FOLDER_BY_CONTEXT[context];
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  res.json({
    signature,
    timestamp,
    folder,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  });
});
