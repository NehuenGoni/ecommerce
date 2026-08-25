import type { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const UPLOAD_FOLDER = "growshop/products";

/**
 * El navegador sube la imagen directamente a Cloudinary (no pasa por nuestro
 * servidor). Acá solo generamos la firma con el api_secret, que nunca se
 * expone al frontend.
 */
export const getCloudinarySignature = asyncHandler(async (_req: Request, res: Response) => {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder: UPLOAD_FOLDER };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  res.json({
    signature,
    timestamp,
    folder: UPLOAD_FOLDER,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  });
});
