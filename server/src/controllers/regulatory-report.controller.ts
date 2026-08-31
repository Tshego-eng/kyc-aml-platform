import { Request, Response } from "express";
import { RegulatoryReportType } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  acknowledgeRegulatoryReport,
  createRegulatoryReport,
  submitRegulatoryReport,
} from "../services/regulatory-report.service";
import { createAuditLog } from "../services/audit.service";

const handleReportError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    return res.status(500).json({
      error: "Regulatory report operation failed",
    });
  }

  switch (error.message) {
    case "CASE_NOT_FOUND":
      return res.status(404).json({ error: "AML case not found" });
    case "SUBMITTER_NOT_FOUND":
      return res.status(404).json({ error: "Submitting user not found" });
    case "REGULATORY_REPORT_NOT_FOUND":
      return res.status(404).json({ error: "Regulatory report not found" });
    case "REPORT_REASON_REQUIRED":
      return res.status(400).json({ error: "reason is required" });
    case "INVALID_REGULATORY_REPORT_STATUS":
      return res.status(409).json({
        error: "Invalid regulatory report status transition",
      });
    default:
      return res.status(500).json({
        error: "Regulatory report operation failed",
        details: error.message,
      });
  }
};

export const createRegulatoryReportController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const rawCaseId = req.params.caseId;
    const caseId = Array.isArray(rawCaseId) ? rawCaseId[0] : rawCaseId;
    const { reason, reportType } = req.body ?? {};
    const submittedById = req.user?.userId;

    if (!caseId) {
      return res.status(400).json({ error: "Case id is required" });
    }

    if (!submittedById) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const report = await createRegulatoryReport(
      caseId,
      submittedById,
      reason,
      reportType as RegulatoryReportType | undefined
    );

    await createAuditLog({
      userId: submittedById,
      action: "REGULATORY_REPORT_CREATED",
      entity: "RegulatoryReport",
      entityId: report.id,
      details: {
        caseId: report.caseId,
        customerId: report.customerId,
        reportType: report.reportType,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: "Regulatory report created successfully",
      report,
    });
  } catch (error) {
    console.error("Create regulatory report error:", error);
    return handleReportError(error, res);
  }
};

export const submitRegulatoryReportController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { referenceNumber } = req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: "Report id is required" });
    }

    const report = await submitRegulatoryReport(id, referenceNumber);

    await createAuditLog({
      userId: req.user?.userId,
      action: "REGULATORY_REPORT_SUBMITTED",
      entity: "RegulatoryReport",
      entityId: report.id,
      details: {
        caseId: report.caseId,
        referenceNumber: report.referenceNumber,
      },
      ipAddress: req.ip,
    });

    return res.json({
      message: "Regulatory report submitted successfully",
      report,
    });
  } catch (error) {
    console.error("Submit regulatory report error:", error);
    return handleReportError(error, res);
  }
};

export const acknowledgeRegulatoryReportController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      return res.status(400).json({ error: "Report id is required" });
    }

    const report = await acknowledgeRegulatoryReport(id);

    await createAuditLog({
      userId: req.user?.userId,
      action: "REGULATORY_REPORT_ACKNOWLEDGED",
      entity: "RegulatoryReport",
      entityId: report.id,
      details: {
        caseId: report.caseId,
        referenceNumber: report.referenceNumber,
      },
      ipAddress: req.ip,
    });

    return res.json({
      message: "Regulatory report acknowledged successfully",
      report,
    });
  } catch (error) {
    console.error("Acknowledge regulatory report error:", error);
    return handleReportError(error, res);
  }
};
