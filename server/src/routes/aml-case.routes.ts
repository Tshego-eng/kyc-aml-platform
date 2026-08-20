import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

import {
  createAMLCaseController,
  getAMLCaseListController,
  getAMLCaseController,
  assignAMLCaseController,
  addInvestigationNoteController,
  getCase,
  updateAMLCaseStatusController,
} from "../controllers/aml-case.controller";

const router = Router();

router.post(
  "/aml-cases",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER"
  ),
  createAMLCaseController
);

router.get(
  "/aml-cases",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  getAMLCaseListController
);

router.get(
  "/aml-cases/:id",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  getAMLCaseController
);

router.patch(
  "/aml-cases/:id/assign",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER"
  ),
  assignAMLCaseController
);

router.patch(
  "/aml-cases/:id/status",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER"
  ),
  updateAMLCaseStatusController
);

router.post(
  "/aml-cases/:id/notes",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER"
  ),
  addInvestigationNoteController
);

router.get(
  "/cases/:id",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  getCase
);

export default router;