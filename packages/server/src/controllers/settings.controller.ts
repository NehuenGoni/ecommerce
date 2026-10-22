import type { Request, Response } from "express";
import * as settingsService from "../services/settings.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const pricing = await settingsService.getPricingSettings();
  res.json({ settings: { pricing } });
});

export const updatePricing = asyncHandler(async (req: Request, res: Response) => {
  const pricing = await settingsService.updatePricingSettings(req.body);
  res.json({ settings: { pricing } });
});
