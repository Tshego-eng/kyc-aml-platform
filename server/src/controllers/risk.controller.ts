import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
  calculateCustomerRisk,
  createRiskAssessment,
  assessCustomerRisk,
} from "../services/risk.service";

export const calculateRiskController = async (
  req: Request,
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

    const result = await calculateCustomerRisk(customerId);

    return res.json({
      customerId,
      risk: result,
    });
  } catch (error) {
    console.error("Risk calculation error:", error);

    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(500).json({
      error: "Failed to calculate customer risk",
    });
  }
};

export const createRiskAssessmentController = async (
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

    const assessment = await createRiskAssessment(customerId);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: "RISK_ASSESSMENT_CREATED",
        entity: "RiskAssessment",
        entityId: assessment.id,
        details: {
          customerId,
          score: assessment.score,
          level: assessment.level,
        },
      },
    });

    return res.status(201).json({
      message: "Risk assessment created successfully",
      assessment,
    });
  } catch (error) {
    console.error("Risk assessment error:", error);

    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(500).json({
      error: "Failed to create risk assessment",
    });
  }
};

export async function assessRisk(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { id } = req.params;
    const customerId = Array.isArray(id) ? id[0] : id;

    if (!customerId) {
      return res.status(400).json({
        error: "Customer id is required",
      });
    }

    const assessment = await assessCustomerRisk(
      customerId
    );

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: "RISK_ASSESSMENT_CREATED",
        entity: "RiskAssessment",
        entityId: assessment.id,
        details: {
          customerId,
          score: assessment.score,
          level: assessment.level,
        },
      },
    });

    return res.status(201).json({
      message: "Customer risk assessment completed",
      assessment,
    });
  } catch (error) {
    console.error("Risk assessment error:", error);

    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(500).json({
      error: "Failed to assess customer risk",
    });
  }
}