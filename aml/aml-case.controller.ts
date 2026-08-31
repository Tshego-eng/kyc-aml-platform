import { Request, Response } from "express";

import {
  createAMLCase,
  getAMLCaseList,
  getAMLCaseById,
  assignAMLCase,
  addInvestigationNote,
  addCaseEvidence,
  updateAMLCaseStatus,
} from "../server/src/services/aml-case.service";
import { AuthenticatedRequest } from "../server/src/middleware/auth.middleware";
import prisma from "../server/src/lib/prisma";
import { CaseStatus } from "@prisma/client";

export const createAMLCaseController = async (
  req: Request,
  res: Response
) => {
  try {
    const { alertId } = req.body;

    if (!alertId) {
      return res.status(400).json({
        error: "alertId is required",
      });
    }

    const amlCase =
      await createAMLCase(alertId);

    return res.status(201).json({
      message: "AML case created successfully",
      case: amlCase,
    });
  } catch (error) {
    console.error(
      "Create AML case error:",
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
        "CASE_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        error:
          "A case already exists for this alert",
      });
    }

    return res.status(500).json({
      error: "Failed to create AML case",
    });
  }
};

export const getAMLCaseListController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { status } = req.query;

      const cases =
        await getAMLCaseList(
          status as string | undefined
        );

      return res.json({
        cases,
      });
    } catch (error) {
      console.error(
        "Get AML cases error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to retrieve AML cases",
      });
    }
  };

export const getAMLCaseController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const caseId = Array.isArray(id) ? id[0] : id;

    if (!caseId) {
      return res.status(400).json({
        error: "Case id is required",
      });
    }

    const amlCase =
      await getAMLCaseById(caseId);

    return res.json({
      case: amlCase,
    });
  } catch (error) {
    console.error(
      "Get AML case error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "CASE_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "AML case not found",
      });
    }

    return res.status(500).json({
      error:
        "Failed to retrieve AML case",
    });
  }
};

export const assignAMLCaseController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } = req.params;
      const caseId = Array.isArray(id) ? id[0] : id;

      if (!caseId) {
        return res.status(400).json({
          error: "Case id is required",
        });
      }

      const { reviewerId } = req.body;

      if (!reviewerId) {
        return res.status(400).json({
          error: "reviewerId is required",
        });
      }

      const amlCase =
        await assignAMLCase(
          caseId,
          reviewerId
        );

      return res.json({
        message:
          "AML case assigned successfully",
        case: amlCase,
      });
    } catch (error) {
      console.error(
        "Assign AML case error:",
        error
      );

      if (
        error instanceof Error &&
        error.message === "CASE_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "AML case not found",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "REVIEWER_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "Reviewer not found",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "INVALID_REVIEWER_ROLE"
      ) {
        return res.status(403).json({
          error:
            "Reviewer must be an Admin or Compliance Officer",
        });
      }

      return res.status(500).json({
        error:
          "Failed to assign AML case",
      });
    }
  };

export const updateAMLCaseStatusController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const caseId = Array.isArray(id) ? id[0] : id;

    if (!caseId) {
      return res.status(400).json({
        error: "Case id is required",
      });
    }

    const { status: newStatus, resolution, regulatoryDecision, regulatoryReason, } = req.body;
    if (
      !Object.values(CaseStatus).includes(newStatus)
    ) {
      return res.status(400).json({
        error:
          "status must be one of OPEN, INVESTIGATING, ESCALATED, RESOLVED, CLOSED, or FALSE_POSITIVE",
      });
    }

    const assessment = await prisma.aMLCase.findUnique({
      where: {
        id: caseId,
      },
      select: {
        status: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        error: "AML case not found",
      });
    }

    const previousStatus = assessment.status;
    const updatedCase = await updateAMLCaseStatus(
      caseId,
      newStatus,
      resolution,
      regulatoryDecision,
      regulatoryReason
    );

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: "CASE_STATUS_CHANGED",
        entity: "AMLCase",
        entityId: caseId,
        details: {
          previousStatus,
          newStatus,
          resolution,
          regulatoryDecision,
          regulatoryReason,
        },
      },
    });

    return res.json({
      message: "AML case status updated successfully",
      case: updatedCase,
    });
  } catch (error) {
    console.error("Update AML case status error:", error);

    if (
      error instanceof Error &&
      error.message === "INVALID_STATUS_TRANSITION"
    ) {
      return res.status(409).json({
        error: "Invalid AML case status transition",
      });
    }

    if (
      error instanceof Error &&
      error.message === "RESOLUTION_REQUIRED"
    ) {
      return res.status(400).json({
        error:
          "resolution is required",
      });
    }

    if (
      error instanceof Error &&
      error.message === "REGULATORY_DECISION_REQUIRED"
    ) {
      return res.status(400).json({
        error:
          "regulatoryDecision is required when resolving a case",
      });
    }

    if (
      error instanceof Error &&
      error.message === "REGULATORY_REASON_REQUIRED"
    ) {
      return res.status(400).json({
        error:
          "regulatoryReason is required when a regulatory decision is provided",
      });
    }

    return res.status(500).json({
      error: "Failed to update AML case status",
    });
  }
};

export const addInvestigationNoteController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } = req.params;
      const caseId = Array.isArray(id) ? id[0] : id;

      if (!caseId) {
        return res.status(400).json({
          error: "Case id is required",
        });
      }

      const { note } = req.body;

      if (!note) {
        return res.status(400).json({
          error: "Note is required",
        });
      }

      // Your authenticate middleware should
      // already attach the authenticated user.
      const userId = (req as any).user.userId;

      const investigationNote =
        await addInvestigationNote(
          caseId,
          userId,
          note
        );

      return res.status(201).json({
        message:
          "Investigation note added successfully",
        note: investigationNote,
      });
    } catch (error) {
      console.error(
        "Add investigation note error:",
        error
      );

      if (
        error instanceof Error &&
        error.message === "CASE_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "AML case not found",
        });
      }

      if (
        error instanceof Error &&
        error.message === "NOTE_REQUIRED"
      ) {
        return res.status(400).json({
          error: "Note is required",
        });
      }

      return res.status(500).json({
        error:
          "Failed to add investigation note",
      });
    }
  };

export const addCaseEvidenceController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const caseId = Array.isArray(id) ? id[0] : id;

    if (!caseId) {
      return res.status(400).json({
        error: "Case id is required",
      });
    }

    const { fileName, fileType, description } = req.body;

    if (typeof fileName !== "string" || !fileName.trim()) {
      return res.status(400).json({
        error: "fileName is required",
      });
    }

    const uploadedBy = req.user?.userId;
    if (!uploadedBy) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const evidence = await addCaseEvidence(
      caseId,
      uploadedBy,
      fileName,
      typeof fileType === "string" ? fileType : undefined,
      typeof description === "string" ? description : undefined
    );

    return res.status(201).json({
      message: "Case evidence added successfully",
      evidence,
    });
  } catch (error) {
    console.error("Add case evidence error:", error);

    if (error instanceof Error && error.message === "CASE_NOT_FOUND") {
      return res.status(404).json({
        error: "AML case not found",
      });
    }

    if (error instanceof Error && error.message === "FILE_NAME_REQUIRED") {
      return res.status(400).json({
        error: "fileName is required",
      });
    }

    return res.status(500).json({
      error: "Failed to add case evidence",
    });
  }
};

  export async function getCase(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
      const caseId = Array.isArray(id) ? id[0] : id;

      if (!caseId) {
        return res.status(400).json({
          error: "Case id is required",
        });
      }

      const complianceCase = await getAMLCaseById(
        caseId
      );

    return res.status(200).json({
      case: complianceCase,
    });
  } catch (error) {
    console.error("Get case error:", error);
     if (
      error instanceof Error &&
      error.message === "CASE_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Compliance case not found",
      });
    }

    return res.status(500).json({
      error: "Failed to retrieve compliance case",
    });
  }
}
