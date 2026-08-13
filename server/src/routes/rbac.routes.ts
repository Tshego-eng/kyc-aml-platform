import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";

import { authorize } from "../middleware/rbac.middleware";

import {
  adminTest,
  complianceTest,
  analystTest,
} from "../controllers/rbac.controller";

const router = Router();

router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  adminTest
);

router.get(
  "/compliance",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER"),
  complianceTest
);

router.get(
  "/analyst",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  analystTest
);

export default router;