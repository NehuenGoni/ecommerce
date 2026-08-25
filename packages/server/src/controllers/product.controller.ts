import type { Request, Response } from "express";
import * as productService from "../services/product.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { ProductQuery } from "../validators/product.validators.js";

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ProductQuery;
  const includeInactive = req.user?.role === "admin";
  const result = await productService.listProducts(query, includeInactive);
  res.json(result);
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const includeInactive = req.user?.role === "admin";
  const product = await productService.getProductByIdOrSlug(req.params.idOrSlug!, includeInactive);
  res.json({ product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id!, req.body);
  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id!);
  res.status(204).send();
});
