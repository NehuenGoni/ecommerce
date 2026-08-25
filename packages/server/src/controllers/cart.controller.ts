import type { Request, Response } from "express";
import * as cartService from "../services/cart.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  res.json(cart);
});

export const syncCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.syncCart(req.user!.id, req.body.items);
  res.json(cart);
});

export const setCartItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, variantSku, quantity } = req.body;
  const cart = await cartService.setCartItem(req.user!.id, productId, variantSku, quantity);
  res.json(cart);
});

export const removeCartItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.removeCartItem(
    req.user!.id,
    req.params.productId!,
    req.params.variantSku!,
  );
  res.json(cart);
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  await cartService.clearCart(req.user!.id);
  res.status(204).send();
});
