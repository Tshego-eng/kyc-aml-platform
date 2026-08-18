import { Request, Response } from "express";

import {
  createAMLCase,
  getAMLCaseList,
  getAMLCaseById,
  assignAMLCase,
  addInvestigationNote,
} from "../services/aml-case.service";

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