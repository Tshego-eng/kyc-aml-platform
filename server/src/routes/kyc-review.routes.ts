import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

import {
  createKYCReviewController,
  getKYCReviewHistoryController,
  getKYCOverviewController,
} from "../controllers/kyc-review.controller";

const router = Router();

router.post(
  "/customers/:id/kyc-review",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER"),
  createKYCReviewController
);

router.get(
  "/customers/:id/kyc-review",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  getKYCReviewHistoryController
);

router.get(
  "/customers/:id/kyc-overview",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  getKYCOverviewController
);

export default router;