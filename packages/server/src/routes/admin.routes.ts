import { Router } from "express";
import {
  cancelInvite,
  inviteAdmin,
  listAdmins,
  listInvites,
  reactivateAdmin,
  revokeAdmin,
} from "../controllers/admin.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { inviteAdminSchema } from "../validators/admin.validators.js";

export const adminRouter: Router = Router();

adminRouter.use(authenticate, requireRole("admin"));

adminRouter.get("/admins", listAdmins);
adminRouter.patch("/admins/:id/revoke", revokeAdmin);
adminRouter.patch("/admins/:id/reactivate", reactivateAdmin);

adminRouter.get("/invites", listInvites);
adminRouter.post("/invites", validateBody(inviteAdminSchema), inviteAdmin);
adminRouter.delete("/invites/:id", cancelInvite);
