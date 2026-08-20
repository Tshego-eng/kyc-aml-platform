import { Router } from "express";

import {
  getDashboardActivityController,
  getDashboardAMLController,
  getDashboardCasesController,
  getDashboardKYCController,
  getDashboardRiskController,
  getDashboardSummaryController,
  getDashboardTransactionsController,
} from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

const router = Router();

const dashboardReadRoles = [
  "ADMIN",
  "COMPLIANCE_OFFICER",
  "ANALYST",
  "VIEWER",
] as const;

router.get(
  "/dashboard/summary",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardSummaryController
);

router.get(
  "/dashboard/kyc",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardKYCController
);

router.get(
  "/dashboard/aml",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardAMLController
);

router.get(
  "/dashboard/risk",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardRiskController
);

router.get(
  "/dashboard/cases",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardCasesController
);

router.get(
  "/dashboard/transactions",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardTransactionsController
);

router.get(
  "/dashboard/activity",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardActivityController
);

export default router;
