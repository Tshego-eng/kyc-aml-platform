import { Router } from "express";

import {
  getDashboardActivityController,
  getDashboardAMLController,
  getDashboardCasesController,
  getDashboardKYCController,
  getDashboardRiskController,
  getDashboardSummaryController,
  getDashboardTransactionsController,
  getDashboardAMLTrendsController,
  getDashboardKYCAndRiskController,
  getHighRiskCustomersController,
  getRepeatAMLAlertCustomersController,
  getSuspiciousPatternsController,
  getComplianceOfficerWorkloadController,
  getRiskIntelligenceController,
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

const riskIntelligenceRoles = [
  "ADMIN",
  "COMPLIANCE_OFFICER",
  "ANALYST",
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

router.get(
  "/dashboard/aml/trends",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardAMLTrendsController
);

router.get(
  "/dashboard/kyc-risk",
  authenticate,
  authorize(...dashboardReadRoles),
  getDashboardKYCAndRiskController
);

router.get(
  "/dashboard/high-risk-customers",
  authenticate,
  authorize(...dashboardReadRoles),
  getHighRiskCustomersController
);

router.get(
  "/dashboard/aml/repeat-alert-customers",
  authenticate,
  authorize(...dashboardReadRoles),
  getRepeatAMLAlertCustomersController
);

router.get(
  "/dashboard/aml/suspicious-patterns",
  authenticate,
  authorize(...dashboardReadRoles),
  getSuspiciousPatternsController
);

router.get(
  "/dashboard/compliance-officers/workload",
  authenticate,
  authorize(...dashboardReadRoles),
  getComplianceOfficerWorkloadController
);

router.get(
  "/dashboard/risk-intelligence",
  authenticate,
  authorize(...riskIntelligenceRoles),
  getRiskIntelligenceController
);

export default router;


