import { Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth.middleware";

import { createKYCReview,
  getKYCReviewHistory, getKYCOverview, } from "../services/kyc-review.service";

import { createAuditLog } from "../services/audit.service";

export const createKYCReviewController = async (
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

    const { decision, reason } = req.body;

    if (!decision) {
      return res.status(400).json({
        error: "Decision is required",
      });
    }

    const allowedDecisions = [
      "APPROVE",
      "REJECT",
      "REQUEST_REVIEW",
    ];

    if (!allowedDecisions.includes(decision)) {
      return res.status(400).json({
        error: "Invalid review decision",
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        error: "A review reason of at least 5 characters is required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        error: "Customer id is required",
      });
    }

    const result = await createKYCReview({
      customerId,
      reviewerId: req.user.userId,
      decision,
      reason,
    });

    await createAuditLog({
      userId: req.user.userId,
      action: "KYC_REVIEW_COMPLETED",
      entity: "KYCReview",
      entityId: result.review.id,
      details: {
        customerId,
        decision,
        reason,
        resultingKYCStatus: result.kycStatus,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: "KYC review completed",
      review: result.review,
      kycStatus: result.kycStatus,
    });
  } catch (error) {
    console.error("KYC review error:", error);

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
      error.message === "DUPLICATE_REVIEW"
    ) {
      return res.status(409).json({
        error: "This review decision has already been recorded",
      });
    }

    return res.status(500).json({
      error: "Failed to complete KYC review",
    });
  }
};

export const getKYCReviewHistoryController = async (
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

    const reviews = await getKYCReviewHistory(customerId);

    return res.json({
      customerId,
      reviews,
    });
  } catch (error) {
console.error(
  "KYC review error:",
  error instanceof Error ? error.message : error
);
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
    error.message === "DUPLICATE_REVIEW"
  ) {
    return res.status(409).json({
      error: "This review decision has already been recorded",
    });
  }

    return res.status(500).json({
      error: "Failed to retrieve KYC review history",
    });
  }
};

export const getKYCOverviewController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const customerId = Array.isArray(id) ? id[0] : id;

    if (!customerId) {
      return res.status(400).json({
        error: "Customer id is required",
      });
    }

    const customer = await getKYCOverview(customerId);

    return res.json({
      customer,
    });
  } catch (error) {
    console.error("KYC overview error:", error);

    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(500).json({
      error: "Failed to retrieve KYC overview",
    });
  }
};