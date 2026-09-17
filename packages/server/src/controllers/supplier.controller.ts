import type { Request, Response } from "express";
import * as supplierService from "../services/supplier.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { SupplierQuery } from "../validators/supplier.validators.js";

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as SupplierQuery;
  const suppliers = await supplierService.listSuppliers(query);
  res.json({ suppliers });
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.getSupplierById(req.params.id!);
  res.json({ supplier });
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.createSupplier(req.body);
  res.status(201).json({ supplier });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.updateSupplier(req.params.id!, req.body);
  res.json({ supplier });
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  await supplierService.deleteSupplier(req.params.id!);
  res.status(204).send();
});
