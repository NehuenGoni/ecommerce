import type { Request, Response } from "express";
import * as checkoutService from "../services/checkout.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const postCheckout = asyncHandler(async (req: Request, res: Response) => {
  const result = await checkoutService.checkout(req.user!.id, req.body);
  res.status(201).json({ order: result.order, paymentRedirectUrl: result.paymentRedirectUrl });
});

export const mercadoPagoWebhook = asyncHandler(async (req: Request, res: Response) => {
  await checkoutService.handleMercadoPagoWebhook(
    req.query as Record<string, unknown>,
    req.body as Record<string, unknown>,
  );
  // MP reintenta si no recibe 200: respondemos siempre OK salvo error interno real.
  res.status(200).send();
});
