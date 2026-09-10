import prisma from "../lib/prisma";

export const getCaseEscalationReasons = (input: {
  riskLevel?: string | null;
  criticalAlertCount: number;
  highAlertCount: number;
  failedKYCCheckCount: number;
}) => {
  const reasons: string[] = [];

  if (input.riskLevel === "CRITICAL") {
    reasons.push("CRITICAL customer risk level");
  } else if (input.riskLevel === "HIGH") {
    reasons.push("HIGH customer risk level");
  }

  if (input.criticalAlertCount > 0) {
    reasons.push("Unresolved CRITICAL AML alert");
  }

  if (input.highAlertCount >= 2) {
    reasons.push("Multiple unresolved HIGH AML alerts");
  }

  if (input.failedKYCCheckCount > 0) {
    reasons.push("Failed KYC verification check");
  }

  return reasons;
};

export const evaluateCaseEscalation = async (
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
          kycChecks: true,
        },
      },
    },
  });

  if (!amlCase) {
    throw new Error("AML_CASE_NOT_FOUND");
  }

  const risk = amlCase.customer.riskAssessments[0];

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

  const reasons = getCaseEscalationReasons({
    riskLevel: risk?.level,
    criticalAlertCount: criticalAlerts.length,
    highAlertCount: highAlerts.length,
    failedKYCCheckCount: failedKYCChecks.length,
  });

  const shouldEscalate = reasons.length > 0;

  return {
    caseId,
    shouldEscalate,
    reasons,
    riskLevel: risk?.level ?? null,
    criticalAlertCount: criticalAlerts.length,
    highAlertCount: highAlerts.length,
    failedKYCCheckCount: failedKYCChecks.length,
  };
};