import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

import {
  getUsersController,
  updateUserRoleController,
} from "../controllers/user.controller";

const router = Router();

router.get("/", authenticate, authorize("ADMIN"), getUsersController);

router.patch(
  "/:id/role",
  authenticate,
  authorize("ADMIN"),
  updateUserRoleController
);

export default router;
