import prisma from "../lib/prisma";
import { CaseDecision } from "../types/aml-case";

const validDecisions: CaseDecision[] = [
  "CONTINUE_INVESTIGATION",
  "FALSE_POSITIVE",
  "RESOLVE",
  "ESCALATE",
  "REGULATORY_REPORT",
];

export const validateCaseDecision = async (
  caseId: string,
  decision: string
) => {
  const amlCase = await prisma.aMLCase.findUnique({
    where: {
      id: caseId,
    },
  });

  if (!amlCase) {
    throw new Error("AML_CASE_NOT_FOUND");
  }

  if (!validDecisions.includes(decision as CaseDecision)) {
    throw new Error("INVALID_CASE_DECISION");
  }

  const currentStatus = amlCase.status;

  if (
    ["CLOSED", "FALSE_POSITIVE", "RESOLVED"].includes(
      currentStatus
    )
  ) {
    throw new Error(
      "CASE_ALREADY_FINALIZED"
    );
  }

  if (
    decision === "REGULATORY_REPORT" &&
    currentStatus !== "ESCALATED"
  ) {
    throw new Error(
      "CASE_MUST_BE_ESCALATED_BEFORE_REGULATORY_REPORT"
    );
  }

  return {
    valid: true,
    caseId,
    currentStatus,
    decision,
  };
};