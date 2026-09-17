import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import {
  applyImport,
  discardImport,
  getImport,
  listImports,
  updateImport,
  updateLine,
  uploadInvoice,
} from "../controllers/supplierInvoiceImport.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { invoiceUpload } from "../middleware/uploadFile.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  applyImportSchema,
  importQuerySchema,
  updateImportHeaderSchema,
  updateLineSchema,
  uploadInvoiceBodySchema,
} from "../validators/supplierInvoiceImport.validators.js";

// Cada carga dispara una extracción por IA, que cuesta dinero real -- límite
// propio y más estricto que el general de /api. Relajado en test, mismo
// criterio que authLimiter en auth.routes.ts.
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas facturas subidas. Probá de nuevo en un minuto." },
});

export const supplierInvoiceImportRouter: Router = Router();

supplierInvoiceImportRouter.use(authenticate, requireRole("admin"));

supplierInvoiceImportRouter.post(
  "/",
  uploadLimiter,
  invoiceUpload.single("file"),
  validateBody(uploadInvoiceBodySchema),
  uploadInvoice,
);
supplierInvoiceImportRouter.get("/", validateQuery(importQuerySchema), listImports);
supplierInvoiceImportRouter.get("/:id", getImport);
supplierInvoiceImportRouter.patch("/:id", validateBody(updateImportHeaderSchema), updateImport);
supplierInvoiceImportRouter.patch("/:id/lines/:lineNumber", validateBody(updateLineSchema), updateLine);
supplierInvoiceImportRouter.post("/:id/apply", validateBody(applyImportSchema), applyImport);
supplierInvoiceImportRouter.delete("/:id", discardImport);
