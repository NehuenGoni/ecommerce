import { Router } from "express";
import {
  clearCart,
  getCart,
  removeCartItem,
  setCartItem,
  syncCart,
} from "../controllers/cart.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { setCartItemSchema, syncCartSchema } from "../validators/cart.validators.js";

export const cartRouter: Router = Router();

cartRouter.use(authenticate);

cartRouter.get("/", getCart);
cartRouter.put("/", validateBody(syncCartSchema), syncCart);
cartRouter.delete("/", clearCart);
cartRouter.patch("/items", validateBody(setCartItemSchema), setCartItem);
cartRouter.delete("/items/:productId/:variantSku", removeCartItem);
