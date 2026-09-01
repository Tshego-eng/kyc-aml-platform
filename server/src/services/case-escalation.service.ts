import prisma from "../lib/prisma";

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

  const reasons: string[] = [];

  if (risk?.level === "CRITICAL") {
    reasons.push("CRITICAL customer risk level");
  }

  if (criticalAlerts.length > 0) {
    reasons.push("Unresolved CRITICAL AML alert");
  }

  if (highAlerts.length >= 2) {
    reasons.push("Multiple unresolved HIGH AML alerts");
  }

  if (failedKYCChecks.length > 0) {
    reasons.push("Failed KYC verification check");
  }

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