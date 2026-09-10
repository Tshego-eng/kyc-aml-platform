import prisma from "../lib/prisma";

const HIGH_RISK_COUNTRIES = [
  "CountryA",
  "CountryB",
  "CountryC",
];

const HIGH_RISK_OCCUPATIONS = [
  "cash dealer",
  "money exchange",
  "gambling",
  "crypto trader",
];

export const RISK_SCORE_MAX = 100;

export const RISK_LEVEL_THRESHOLDS = {
  MEDIUM: 25,
  HIGH: 50,
  CRITICAL: 75,
} as const;

const ACTIVE_ALERT_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "ESCALATED",
] as const;

const AML_ALERT_RISK_POINTS = {
  HIGH: 10,
  CRITICAL: 25,
  MULTIPLE_HIGH_BONUS: 15,
} as const;

type RiskAlert = {
  severity: string;
  status: string;
};

export const getAMLAlertRiskContribution = (
  alerts: RiskAlert[]
) => {
  const activeAlerts = alerts.filter((alert) =>
    ACTIVE_ALERT_STATUSES.includes(
      alert.status as (typeof ACTIVE_ALERT_STATUSES)[number]
    )
  );
  const highAlertCount = activeAlerts.filter(
    (alert) => alert.severity === "HIGH"
  ).length;
  const criticalAlertCount = activeAlerts.filter(
    (alert) => alert.severity === "CRITICAL"
  ).length;

  const score =
    highAlertCount * AML_ALERT_RISK_POINTS.HIGH +
    criticalAlertCount * AML_ALERT_RISK_POINTS.CRITICAL +
    (highAlertCount >= 2
      ? AML_ALERT_RISK_POINTS.MULTIPLE_HIGH_BONUS
      : 0);
  const reasons: string[] = [];

  if (highAlertCount > 0) {
    reasons.push(
      `${highAlertCount} unresolved HIGH AML alert${
        highAlertCount === 1 ? "" : "s"
      } contributed to customer risk`
    );
  }

  if (criticalAlertCount > 0) {
    reasons.push(
      `${criticalAlertCount} unresolved CRITICAL AML alert${
        criticalAlertCount === 1 ? "" : "s"
      } contributed to customer risk`
    );
  }

  if (highAlertCount >= 2) {
    reasons.push(
      "Multiple unresolved HIGH AML alerts added a cumulative risk adjustment"
    );
  }

  return { score, reasons };
};

export const getRiskLevelForScore = (
  score: number
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" => {
  if (score >= RISK_LEVEL_THRESHOLDS.CRITICAL) {
    return "CRITICAL";
  }

  if (score >= RISK_LEVEL_THRESHOLDS.HIGH) {
    return "HIGH";
  }

  if (score >= RISK_LEVEL_THRESHOLDS.MEDIUM) {
    return "MEDIUM";
  }

  return "LOW";
};

export const calculateCustomerRisk = async (
  customerId: string
) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    include: {
      kycChecks: true,
      amlAlerts: true,
      transactions: true,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  let score = 0;

  const reasons: string[] = [];

  // Country risk
  if (
    HIGH_RISK_COUNTRIES.some(
      country =>
        country.toLowerCase() === customer.country.toLowerCase()
    )
  ) {
    score += 30;
    reasons.push("Customer is associated with a high-risk country");
  }

  // Source of funds
  if (!customer.sourceOfFunds) {
    score += 20;
    reasons.push("Source of funds was not provided");
  }

  // Occupation
  if (!customer.occupation) {
    score += 5;
    reasons.push("Occupation was not provided");
  } else if (
    HIGH_RISK_OCCUPATIONS.includes(
      customer.occupation.toLowerCase()
    )
  ) {
    score += 15;
    reasons.push("Customer has a high-risk occupation");
  }

  // Income
  if (!customer.annualIncome) {
    score += 5;
    reasons.push("Annual income was not provided");
  } else if (Number(customer.annualIncome) < 100000) {
    score += 10;
    reasons.push("Annual income is below the configured threshold");
  }

  // KYC checks
  for (const check of customer.kycChecks) {
    if (check.status !== "FAILED") {
      continue;
    }

    switch (check.checkType) {
      case "IDENTITY":
        score += 30;
        reasons.push("Identity verification failed");
        break;

      case "ADDRESS":
        score += 15;
        reasons.push("Address verification failed");
        break;

      case "DATE_OF_BIRTH":
        score += 20;
        reasons.push("Date of birth verification failed");
        break;

      case "EMAIL":
      case "PHONE":
        score += 10;
        reasons.push(`${check.checkType} verification failed`);
        break;
    }
  }

  const amlAlertContribution = getAMLAlertRiskContribution(
    customer.amlAlerts
  );
  score += amlAlertContribution.score;
  reasons.push(...amlAlertContribution.reasons);

  // Never allow score above 100
  score = Math.min(score, RISK_SCORE_MAX);

  const level = getRiskLevelForScore(score);

  return {
    score,
    level,
    reasons,
  };
};

export async function assessCustomerRisk(
  customerId: string
) {
  const result = await calculateCustomerRisk(customerId);

  const assessment = await prisma.riskAssessment.create({
    data: {
      customerId,
      score: result.score,
      level: result.level,
      reasons: result.reasons,
    },
  });

  return assessment;
}

export const createRiskAssessment = async (
  customerId: string
) => {
  const result = await calculateCustomerRisk(customerId);

  const assessment = await prisma.riskAssessment.create({
    data: {
      customerId,
      score: result.score,
      level: result.level,
      reasons: result.reasons,
    },
  });

  return assessment;
  
};

export async function getCustomerRiskHistory(
  customerId: string
) {
  return prisma.riskAssessment.findMany({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}