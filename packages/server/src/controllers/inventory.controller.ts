import type { Request, Response } from "express";
import * as inventoryService from "../services/inventory.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { MovementQuery, StockQuery } from "../validators/inventory.validators.js";

export const getStock = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as StockQuery;
  const result = await inventoryService.getStockOverview(query);
  res.json(result);
});

export const getMovements = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as MovementQuery;
  const result = await inventoryService.listStockMovements(query);
  res.json(result);
});
