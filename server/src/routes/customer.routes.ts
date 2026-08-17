import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";
import {
  createCustomerController,
  getCustomersController,
  getCustomerController,
  updateCustomerController,
} from "../controllers/customer.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST"),
  createCustomerController
);
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST"),
  getCustomersController
);
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST"),
  getCustomerController
);
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST"),
  updateCustomerController
);

export default router;