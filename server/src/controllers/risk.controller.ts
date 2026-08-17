import { Request, Response } from "express";

import {
  calculateCustomerRisk,
  createRiskAssessment,
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

    const assessment = await createRiskAssessment(customerId);

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