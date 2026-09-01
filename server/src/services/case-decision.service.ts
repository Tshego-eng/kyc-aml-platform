import prisma from "../lib/prisma";
import { CaseDecision } from "../types/aml-case";

export const getCaseDecisionRecommendation = async (
  caseId: string
) => {
  const amlCase = await prisma.aMLCase.findUnique({
    where: {
      id: caseId,
    },
    include: {
      customer: {
        include: {
          riskAssessments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          amlAlerts: true,
          transactions: {
            orderBy: {
              timestamp: "desc",
            },
            take: 20,
          },
          kycChecks: true,
        },
      },
    },
  });

  if (!amlCase) {
    throw new Error("AML_CASE_NOT_FOUND");
  }

  const latestRisk = amlCase.customer.riskAssessments[0];

  const activeAlerts = amlCase.customer.amlAlerts.filter(
    (alert: any) =>
      ["OPEN", "INVESTIGATING", "ESCALATED"].includes(
        alert.status
      )
  );

  const criticalAlerts = activeAlerts.filter(
    (alert: any) => alert.severity === "CRITICAL"
  );

  const highAlerts = activeAlerts.filter(
    (alert: any) => alert.severity === "HIGH"
  );

  const failedKYCChecks = amlCase.customer.kycChecks.filter(
    (check: any) => check.status === "FAILED"
  );

  let recommendation: CaseDecision =
    "CONTINUE_INVESTIGATION";

  const reasons: string[] = [];

  if (latestRisk?.level === "CRITICAL") {
    recommendation = "ESCALATE";
    reasons.push("Customer has a CRITICAL risk assessment.");
  }

  if (criticalAlerts.length > 0) {
    recommendation = "ESCALATE";
    reasons.push(
      "Customer has one or more unresolved CRITICAL AML alerts."
    );
  }

  if (failedKYCChecks.length > 0) {
    reasons.push(
      "Customer has failed KYC verification checks."
    );
  }

  if (highAlerts.length >= 2) {
    recommendation = "ESCALATE";
    reasons.push(
      "Customer has multiple unresolved HIGH severity AML alerts."
    );
  }

  if (
    activeAlerts.length === 0 &&
    failedKYCChecks.length === 0 &&
    latestRisk?.level === "LOW"
  ) {
    recommendation = "RESOLVE";

    reasons.push(
      "No active AML alerts, no failed KYC checks, and customer risk is LOW."
    );
  }

  return {
    caseId: amlCase.id,
    customerId: amlCase.customerId,
    recommendation,
    riskLevel: latestRisk?.level ?? null,
    riskScore: latestRisk?.score ?? null,
    activeAlertCount: activeAlerts.length,
    criticalAlertCount: criticalAlerts.length,
    highAlertCount: highAlerts.length,
    failedKYCCheckCount: failedKYCChecks.length,
    reasons,
  };
};