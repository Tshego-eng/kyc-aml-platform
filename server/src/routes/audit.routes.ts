import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

import { getAuditLogs } from "../controllers/audit.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "COMPLIANCE_OFFICER"),
  getAuditLogs
);

export default router;