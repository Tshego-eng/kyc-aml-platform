import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

import {
  getAMLAlertsController,
  getAMLAlertController,
  updateAMLAlertStatusController,
} from "../controllers/aml-alert.controller";

const router = Router();

router.get(
  "/aml-alerts",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  getAMLAlertsController
);

router.get(
  "/aml-alerts/:id",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  getAMLAlertController
);

router.patch(
  "/aml-alerts/:id/status",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER"
  ),
  updateAMLAlertStatusController
);

export default router;