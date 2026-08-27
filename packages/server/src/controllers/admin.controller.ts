import type { Request, Response } from "express";
import * as adminService from "../services/admin.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await adminService.listAdmins();
  res.json({ admins });
});

export const listInvites = asyncHandler(async (_req: Request, res: Response) => {
  const invites = await adminService.listPendingInvites();
  res.json({ invites });
});

export const inviteAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.inviteAdmin(req.body.email, req.user!.id);
  res.status(201).json(result);
});

export const cancelInvite = asyncHandler(async (req: Request, res: Response) => {
  await adminService.cancelInvite(req.params.id!);
  res.status(204).send();
});

export const revokeAdmin = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminService.revokeAdmin(req.params.id!, req.user!.id);
  res.json({ admin });
});

export const reactivateAdmin = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminService.reactivateAdmin(req.params.id!);
  res.json({ admin });
});
