import type { Request, Response } from "express";
import * as userService from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateProfile(req.user!.id, req.body);
  res.json({ user });
});

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.addAddress(req.user!.id, req.body);
  res.status(201).json({ user });
});

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateAddress(req.user!.id, req.params.addressId!, req.body);
  res.json({ user });
});

export const removeAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.removeAddress(req.user!.id, req.params.addressId!);
  res.json({ user });
});
