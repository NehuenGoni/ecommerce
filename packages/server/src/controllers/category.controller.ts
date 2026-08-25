import type { Request, Response } from "express";
import * as categoryService from "../services/category.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { CategoryQuery } from "../validators/category.validators.js";

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as CategoryQuery;
  const includeInactive = req.user?.role === "admin" && query.includeInactive;
  const categories = await categoryService.listCategories(query, includeInactive);
  res.json({ categories });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const includeInactive = req.user?.role === "admin";
  const category = await categoryService.getCategoryByIdOrSlug(req.params.idOrSlug!, includeInactive);
  res.json({ category });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id!, req.body);
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.deleteCategory(req.params.id!);
  res.status(204).send();
});

export const reorderCategories = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.reorderCategories(req.body.items);
  res.status(204).send();
});
