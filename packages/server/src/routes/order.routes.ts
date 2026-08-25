import { Router } from "express";
import {
  changeOrderStatus,
  confirmPayment,
  getOrder,
  listMyOrders,
  listOrders,
  setReceipt,
  setTracking,
} from "../controllers/order.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  changeOrderStatusSchema,
  confirmPaymentSchema,
  myOrdersQuerySchema,
  orderQuerySchema,
  setReceiptSchema,
  setTrackingSchema,
} from "../validators/order.validators.js";

export const orderRouter: Router = Router();

orderRouter.use(authenticate);

// Ruta literal antes que "/:id", o "mine" matchearía como id.
orderRouter.get("/mine", validateQuery(myOrdersQuerySchema), listMyOrders);

orderRouter.get("/", requireRole("admin"), validateQuery(orderQuerySchema), listOrders);
orderRouter.get("/:id", getOrder);

orderRouter.patch(
  "/:id/status",
  requireRole("admin"),
  validateBody(changeOrderStatusSchema),
  changeOrderStatus,
);
orderRouter.patch(
  "/:id/tracking",
  requireRole("admin"),
  validateBody(setTrackingSchema),
  setTracking,
);
orderRouter.patch(
  "/:id/payment",
  requireRole("admin"),
  validateBody(confirmPaymentSchema),
  confirmPayment,
);
// Cualquier usuario autenticado puede subir el comprobante de SU pedido; la
// verificación de ownership vive en el service (mismo criterio que GET /:id).
orderRouter.patch("/:id/receipt", validateBody(setReceiptSchema), setReceipt);
