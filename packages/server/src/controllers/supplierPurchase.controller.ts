import type { Request, Response } from "express";
import * as supplierPurchaseService from "../services/supplierPurchase.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { PurchaseQuery } from "../validators/supplierPurchase.validators.js";

export const listPurchases = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as PurchaseQuery;
  const result = await supplierPurchaseService.listPurchases(query);
  res.json(result);
});

export const getPurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await supplierPurchaseService.getPurchaseById(req.params.id!);
  res.json({ purchase });
});

export const createPurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await supplierPurchaseService.createPurchase(req.body, req.user!.id);
  res.status(201).json({ purchase });
});
