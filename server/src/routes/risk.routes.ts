import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

import {
  calculateRiskController,
  createRiskAssessmentController,
} from "../controllers/risk.controller";

const router = Router();

router.get(
  "/customers/:id/risk",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  calculateRiskController
);

router.post(
  "/customers/:id/risk",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER"
  ),
  createRiskAssessmentController
);

export default router;