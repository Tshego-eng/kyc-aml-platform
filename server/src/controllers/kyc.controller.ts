import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/audit.service";
import {
  performKYCCheck,
  evaluateKYCStatus,
} from "../services/kyc.service";

export const performKYCCheckController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const { id } = req.params;
    const customerId = Array.isArray(id) ? id[0] : id;
    const { checkType } = req.body;

    if (!checkType) {
      return res.status(400).json({
        error: "checkType is required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        error: "Customer id is required",
      });
    }

    const kycCheck = await performKYCCheck({
      customerId,
      checkType,
    });

    await createAuditLog({
      userId: req.user.userId,
      action: "KYC_CHECK_PERFORMED",
      entity: "KYCCheck",
      entityId: kycCheck.id,
      details: {
        customerId,
        checkType,
        status: kycCheck.status,
        score: kycCheck.score,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: "KYC check completed",
      kycCheck,
    });
  } catch (error) {
    console.error("KYC check error:", error);

    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "INVALID_KYC_CHECK_TYPE"
    ) {
      return res.status(400).json({
        error: "Invalid KYC check type",
      });
    }

    return res.status(500).json({
      error: "Failed to perform KYC check",
    });
  }
};

export const evaluateKYCStatusController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const { id } = req.params;
    const customerId = Array.isArray(id) ? id[0] : id;

    if (!customerId) {
      return res.status(400).json({
        error: "Customer id is required",
      });
    }

    const result = await evaluateKYCStatus(customerId);

    await createAuditLog({
      userId: req.user.userId,
      action: "KYC_STATUS_EVALUATED",
      entity: "Customer",
      entityId: customerId,
      details: {
        status: result.status,
        reason: result.reason,
      },
      ipAddress: req.ip,
    });

    return res.json({
      message: "KYC status evaluated",
      ...result,
    });
  } catch (error) {
    console.error("KYC status evaluation error:", error);

    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(500).json({
      error: "Failed to evaluate KYC status",
    });
  }
};