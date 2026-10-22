import type { Request, Response } from "express";
import type { SupportedMimeType } from "../services/anthropic.service.js";
import { signInvoiceFileUrl } from "../services/invoiceArchive.service.js";
import * as invoiceImportService from "../services/invoiceImport.service.js";
import { getPricingSettings } from "../services/settings.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/errors.js";
import type {
  ApplyImportBody,
  ImportQuery,
  UpdateImportHeaderInput,
  UpdateLineInput,
  UploadInvoiceBody,
} from "../validators/supplierInvoiceImport.validators.js";

export const uploadInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError("Falta el archivo de la factura (PDF, JPG, PNG o WEBP)");
  }
  const { supplier } = req.body as UploadInvoiceBody;

  const doc = await invoiceImportService.createImport(
    {
      buffer: req.file.buffer,
      mimeType: req.file.mimetype as SupportedMimeType,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      supplier,
    },
    req.user!.id,
  );

  res.status(201).json({ import: doc });
});

export const listImports = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ImportQuery;
  const result = await invoiceImportService.listImports(query);
  res.json(result);
});

export const getImport = asyncHandler(async (req: Request, res: Response) => {
  const doc = await invoiceImportService.getImportById(req.params.id!);
  const { marginPercent, roundingStep } = await getPricingSettings();
  res.json({
    import: doc,
    fileUrl: signInvoiceFileUrl(doc.file),
    pricingDefaults: { marginPercent, roundingStep },
  });
});

export const updateImport = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateImportHeaderInput;
  const doc = await invoiceImportService.updateImportHeader(req.params.id!, input);
  res.json({ import: doc });
});

export const updateLine = asyncHandler(async (req: Request, res: Response) => {
  const lineNumber = Number(req.params.lineNumber);
  const input = req.body as UpdateLineInput;
  const doc = await invoiceImportService.updateLine(req.params.id!, lineNumber, input);
  res.json({ import: doc });
});

export const applyImport = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ApplyImportBody;
  const result = await invoiceImportService.applyImport(req.params.id!, input, req.user!.id);
  res.json(result);
});

export const discardImport = asyncHandler(async (req: Request, res: Response) => {
  await invoiceImportService.discardImport(req.params.id!);
  res.status(204).send();
});
