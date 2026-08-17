import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

import {
  createTransactionController,
} from "../controllers/transaction.controller";

const router = Router();

router.post(
  "/customers/:id/transactions",
  authenticate,
  authorize(
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST"
  ),
  (req, res) => {
    req.body.customerId = req.params.id;

    return createTransactionController(
      req,
      res
    );
  }
);

export default router;