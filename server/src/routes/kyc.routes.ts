import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

import {
  performKYCCheckController,
  evaluateKYCStatusController,
} from "../controllers/kyc.controller";

const router = Router();

router.post(
  "/customers/:id/kyc-checks",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST"),
  performKYCCheckController
);

router.post(
  "/customers/:id/kyc-status/evaluate",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST"),
  evaluateKYCStatusController
);

export default router;