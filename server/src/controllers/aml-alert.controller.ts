import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
  getAMLAlerts,
  getAMLAlertById,
  updateAMLAlertStatus,
} from "../services/aml-alert.service";

export const getAMLAlertsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { status } = req.query;

    const alerts = await getAMLAlerts(
      status as string | undefined
    );

    return res.json({
      alerts,
    });
  } catch (error) {
    console.error(
      "Get AML alerts error:",
      error
    );

    return res.status(500).json({
      error: "Failed to retrieve AML alerts",
    });
  }
};

export const getAMLAlertController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const alertId = Array.isArray(id) ? id[0] : id;

    if (!alertId) {
      return res.status(400).json({
        error: "Alert id is required",
      });
    }

    const alert =
      await getAMLAlertById(alertId);

    return res.json({
      alert,
    });
  } catch (error) {
    console.error(
      "Get AML alert error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "ALERT_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "AML alert not found",
      });
    }

    return res.status(500).json({
      error: "Failed to retrieve AML alert",
    });
  }
};

export const updateAMLAlertStatusController =
  async (
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
      const alertId = Array.isArray(id) ? id[0] : id;

      if (!alertId) {
        return res.status(400).json({
          error: "Alert id is required",
        });
      }

      const { status } = req.body;

      const allowedStatuses = [
        "OPEN",
        "INVESTIGATING",
        "ESCALATED",
        "RESOLVED",
        "FALSE_POSITIVE",
      ];

      if (
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          error: "Invalid AML alert status",
        });
      }

      const alert =
        await updateAMLAlertStatus(
          alertId,
          status,
          req.user.userId,
          req.ip
        );

      return res.json({
        message:
          "AML alert status updated successfully",
        alert,
      });
    } catch (error) {
      console.error(
        "AML status update error:",
        error
      );

      if (
        error instanceof Error &&
        error.message === "ALERT_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "AML alert not found",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "STATUS_ALREADY_SET"
      ) {
        return res.status(409).json({
          error:
            "Alert already has this status",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "INVALID_STATUS_TRANSITION"
      ) {
        return res.status(409).json({
          error:
            "Invalid AML alert status transition",
        });
      }

      return res.status(500).json({
        error:
          "Failed to update AML alert status",
      });
    }
  };
  