import type { Request, Response } from "express";
import * as orderService from "../services/order.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { MyOrdersQuery, OrderQuery } from "../validators/order.validators.js";

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as OrderQuery;
  const result = await orderService.listOrders(query);
  res.json(result);
});

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as MyOrdersQuery;
  const result = await orderService.listMyOrders(req.user!.id, query);
  res.json(result);
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(req.params.id!, req.user!);
  res.json({ order });
});

export const changeOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body;
  const order = await orderService.changeOrderStatus(req.params.id!, status, note, req.user!.id);
  res.json({ order });
});

export const setTracking = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.setTracking(req.params.id!, req.body.trackingNumber);
  res.json({ order });
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentStatus, note } = req.body;
  const order = await orderService.confirmPayment(req.params.id!, paymentStatus, note, req.user!.id);
  res.json({ order });
});

export const setReceipt = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.setReceiptUrl(req.params.id!, req.user!.id, req.body.receiptUrl);
  res.json({ order });
});
