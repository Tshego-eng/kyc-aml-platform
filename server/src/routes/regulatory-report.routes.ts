import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";
import {
  acknowledgeRegulatoryReportController,
  createRegulatoryReportController,
  submitRegulatoryReportController,
} from "../controllers/regulatory-report.controller";

const router = Router();

router.post(
  "/aml-cases/:caseId/regulatory-reports",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER"),
  createRegulatoryReportController
);

router.patch(
  "/regulatory-reports/:id/submit",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER"),
  submitRegulatoryReportController
);

router.patch(
  "/regulatory-reports/:id/acknowledge",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER"),
  acknowledgeRegulatoryReportController
);

export default router;