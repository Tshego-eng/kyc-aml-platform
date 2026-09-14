import { Request, Response } from "express";
import fs from "fs";

import {
  createAMLCase,
  getAMLCaseList,
  getAMLCaseById,
  assignAMLCase,
  addInvestigationNote,
  addCaseEvidence,
  getCaseEvidenceById,
  deleteCaseEvidenceById,
  updateAMLCaseStatus,
} from "../services/aml-case.service";
import { getCaseDecisionRecommendation } from "../services/case-decision.service";
import { evaluateCaseEscalation } from "../services/case-escalation.service";
import { validateCaseDecision } from "../services/case-decision-validation.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/audit.service";
import { evidenceStoragePath, deleteEvidenceFile } from "../lib/evidenceStorage";
import prisma from "../lib/prisma";
import { CaseStatus, RegulatoryDecision, EvidenceCategory } from "@prisma/client";

const VALID_EVIDENCE_CATEGORIES: EvidenceCategory[] = [
  "IDENTITY_DOCUMENT",
  "TRANSACTION_RECORD",
  "BANK_STATEMENT",
  "CUSTOMER_COMMUNICATION",
  "SUPPORTING_DOCUMENT",
  "OTHER",
];

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

    const {
      status: newStatus,
      resolution,
      regulatoryDecision,
      regulatoryReason,
    } = req.body;
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
      regulatoryDecision as RegulatoryDecision | undefined,
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

    if (
  error instanceof Error &&
  error.message === "INVESTIGATION_CONTEXT_REQUIRED"
) {
  return res.status(400).json({
    error:
      "Investigation notes or evidence are required before closing the AML case",
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

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: "A file is required",
      });
    }

    const { description, category } = req.body;

    if (category !== undefined && !VALID_EVIDENCE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `category must be one of: ${VALID_EVIDENCE_CATEGORIES.join(", ")}`,
      });
    }

    const uploadedBy = req.user?.userId;
    if (!uploadedBy) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    // The real, original filename is always used — never a
    // client-supplied "fileName" field, since that field no longer
    // exists on this endpoint now that an actual file is required.
    const evidence = await addCaseEvidence(
      caseId,
      uploadedBy,
      file.originalname,
      file.mimetype,
      typeof description === "string" ? description : undefined,
      category as EvidenceCategory | undefined,
      file.filename,
      file.size
    );

    await createAuditLog({
      userId: uploadedBy,
      action: "EVIDENCE_UPLOADED",
      entity: "CaseEvidence",
      entityId: evidence.id,
      details: {
        caseId,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        category: evidence.category,
        fileSize: evidence.fileSize,
      },
      ipAddress: req.ip,
    });

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

export const getCaseEvidenceFileController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id, evidenceId: rawEvidenceId } = req.params;
    const caseId = Array.isArray(id) ? id[0] : id;
    const evidenceId = Array.isArray(rawEvidenceId)
      ? rawEvidenceId[0]
      : rawEvidenceId;

    if (!caseId || !evidenceId) {
      return res.status(400).json({
        error: "Case id and evidence id are required",
      });
    }

    const evidence = await getCaseEvidenceById(caseId, evidenceId);

    if (!evidence.storageKey) {
      return res.status(404).json({
        error: "No file was uploaded for this evidence record",
      });
    }

    const filePath = evidenceStoragePath(evidence.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "The evidence file could not be found in storage",
      });
    }

    res.setHeader(
      "Content-Type",
      evidence.fileType ?? "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(evidence.fileName)}"`
    );
    return res.sendFile(filePath);
  } catch (error) {
    if (error instanceof Error && error.message === "EVIDENCE_NOT_FOUND") {
      return res.status(404).json({
        error: "Evidence not found for this case",
      });
    }

    console.error("Get case evidence file error:", error);
    return res.status(500).json({
      error: "Failed to retrieve evidence file",
    });
  }
};

export const deleteCaseEvidenceController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id, evidenceId: rawEvidenceId } = req.params;
    const caseId = Array.isArray(id) ? id[0] : id;
    const evidenceId = Array.isArray(rawEvidenceId)
      ? rawEvidenceId[0]
      : rawEvidenceId;

    if (!caseId || !evidenceId) {
      return res.status(400).json({
        error: "Case id and evidence id are required",
      });
    }

    const deletedBy = req.user?.userId;
    if (!deletedBy) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const evidence = await deleteCaseEvidenceById(caseId, evidenceId);

    if (evidence.storageKey) {
      deleteEvidenceFile(evidence.storageKey);
    }

    await createAuditLog({
      userId: deletedBy,
      action: "EVIDENCE_DELETED",
      entity: "CaseEvidence",
      entityId: evidenceId,
      details: {
        caseId,
        fileName: evidence.fileName,
        category: evidence.category,
      },
      ipAddress: req.ip,
    });

    return res.json({
      message: "Case evidence deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EVIDENCE_NOT_FOUND") {
      return res.status(404).json({
        error: "Evidence not found for this case",
      });
    }

    console.error("Delete case evidence error:", error);
    return res.status(500).json({
      error: "Failed to delete case evidence",
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

export const getCaseDecisionRecommendationController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const result = await getCaseDecisionRecommendation(
      id
    );

    return res.json(result);
  } catch (error) {
    console.error(
      "Case decision recommendation error:",
      error
    );

    if (error instanceof Error) {
      if (error.message === "AML_CASE_NOT_FOUND") {
        return res.status(404).json({
          error: "AML case not found",
        });
      }
    }

    return res.status(500).json({
      error: "Failed to generate case decision recommendation",
    });
  }
};

export const evaluateCaseEscalationController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const result = await evaluateCaseEscalation(
      id
    );

    return res.json(result);
  } catch (error) {
    console.error(
      "Case escalation evaluation error:",
      error
    );

    if (error instanceof Error) {
      if (error.message === "AML_CASE_NOT_FOUND") {
        return res.status(404).json({
          error: "AML case not found",
        });
      }
    }

    return res.status(500).json({
      error: "Failed to evaluate case escalation",
    });
  }
};

export const validateCaseDecisionController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { decision } = req.body;

    const result = await validateCaseDecision(
      id,
      decision
    );

    return res.json(result);
  } catch (error) {
    console.error(
      "Case decision validation error:",
      error
    );

    if (error instanceof Error) {
      switch (error.message) {
        case "AML_CASE_NOT_FOUND":
          return res.status(404).json({
            error: "AML case not found",
          });

        case "INVALID_CASE_DECISION":
          return res.status(400).json({
            error: "Invalid case decision",
          });

        case "CASE_ALREADY_FINALIZED":
          return res.status(409).json({
            error: "Case has already been finalized",
          });

        case "CASE_MUST_BE_ESCALATED_BEFORE_REGULATORY_REPORT":
          return res.status(409).json({
            error:
              "Case must be escalated before a regulatory report can be created",
          });
      }
    }

    return res.status(500).json({
      error: "Failed to validate case decision",
    });
  }
};
