import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

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

const riskRank = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

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

  // Never allow score above 100
  score = Math.min(score, 100);

  let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  if (score >= 75) {
    level = "CRITICAL";
  } else if (score >= 50) {
    level = "HIGH";
  } else if (score >= 25) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

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

  const currentAssessment =
    await prisma.riskAssessment.findFirst({
      where: {
        customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const currentRank = currentAssessment
    ? riskRank[currentAssessment.level]
    : 0;
  const newRank = riskRank[result.level];
  const effectiveResult =
    currentAssessment && newRank < currentRank
      ? {
          score: currentAssessment.score,
          level: currentAssessment.level,
          reasons:
            currentAssessment.reasons as Prisma.InputJsonValue,
        }
      : result;

  const assessment = await prisma.riskAssessment.create({
    data: {
      customerId,
      score: effectiveResult.score,
      level: effectiveResult.level,
      reasons: effectiveResult.reasons,
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