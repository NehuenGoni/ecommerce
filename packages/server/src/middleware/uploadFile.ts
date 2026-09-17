import multer from "multer";
import { BadRequestError } from "../utils/errors.js";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/**
 * A diferencia del resto de los uploads del sitio (firma + browser sube
 * directo a Cloudinary, ver upload.controller.ts), acá el server necesita
 * los bytes en memoria para mandárselos a Claude -- por eso `memoryStorage`
 * en vez de un disco temporal, y por eso este middleware se monta solo en
 * la ruta de subir factura, no globalmente en app.ts.
 */
export const invoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new BadRequestError("Formato no soportado (PDF, JPG, PNG o WEBP)"));
  },
});
