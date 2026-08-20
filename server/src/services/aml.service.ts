import prisma from "../lib/prisma";
import { createAuditLog } from "./audit.service";

export type AMLRuleType =
  | "LARGE_TRANSACTION"
  | "HIGH_RISK_COUNTRY"
  | "RAPID_MOVEMENT"
  | "INCOME_MISMATCH"
  | "STRUCTURING"
  | "UNUSUAL_ACTIVITY";

export interface AMLRuleResult {
  type: AMLRuleType;
  severity: "MEDIUM" | "HIGH";
  description: string;
}

interface AMLThresholds {
  largeTransactionAmount: number;
  rapidMovementWindowMinutes: number;
  rapidMovementAmount: number;
  rapidMovementMinimumTransactions: number;
  incomeMismatchPercentage: number;
  highRiskCountries: string[];
}

const readPositiveNumber = (
  name: string,
  fallback: number
) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const VELOCITY_WINDOW_MINUTES = 60;
const VELOCITY_TRANSACTION_LIMIT = 10;

const RAPID_MOVEMENT_WINDOW_MINUTES = 60;
const RAPID_MOVEMENT_RATIO = 0.8;

const getAMLThresholds = (): AMLThresholds => ({
  largeTransactionAmount: readPositiveNumber(
    "AML_LARGE_TRANSACTION_THRESHOLD",
    100000
  ),
  rapidMovementWindowMinutes: readPositiveNumber(
    "AML_RAPID_MOVEMENT_WINDOW_MINUTES",
    30
  ),
  rapidMovementAmount: readPositiveNumber(
    "AML_RAPID_MOVEMENT_THRESHOLD",
    50000
  ),
  rapidMovementMinimumTransactions: Math.floor(
    readPositiveNumber(
      "AML_RAPID_MOVEMENT_MIN_TRANSACTIONS",
      2
    )
  ),
  incomeMismatchPercentage: readPositiveNumber(
    "AML_INCOME_MISMATCH_PERCENTAGE",
    0.25
  ),
  highRiskCountries: (
    process.env.AML_HIGH_RISK_COUNTRIES ??
    "CountryA,CountryB,CountryC"
  )
    .split(",")
    .map(country => country.trim().toLowerCase())
    .filter(Boolean),
});

export const createTransaction = async (data: {
  customerId: string;
  amount: number;
  currency?: string;
  country: string;
  type:
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "TRANSFER"
    | "PAYMENT";
}) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: data.customerId,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const transaction = await prisma.transaction.create({
    data: {
      customerId: data.customerId,
      amount: data.amount,
      currency: data.currency ?? "ZAR",
      country: data.country,
      type: data.type,
    },
  });

  await createAuditLog({
    action: "TRANSACTION_CREATED",
    entity: "Transaction",
    entityId: transaction.id,
    details: {
      customerId: transaction.customerId,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      type: transaction.type,
    },
  });

  return transaction;
};

const checkLargeTransaction = (
  transaction: {
    amount: any;
  },
  thresholds: AMLThresholds
): AMLRuleResult | null => {
  if (Number(transaction.amount) >= thresholds.largeTransactionAmount) {
    return {
      type: "LARGE_TRANSACTION" as const,
      severity: "HIGH" as const,
      description:
        `Transaction exceeds the configured threshold of ${thresholds.largeTransactionAmount}.`,
    };
  }

  return null;
};

const checkHighRiskCountry = (
  transaction: { country: string },
  thresholds: AMLThresholds
): AMLRuleResult | null => {
  const isHighRisk = thresholds.highRiskCountries.includes(
    transaction.country.trim().toLowerCase()
  );

  if (isHighRisk) {
    return {
      type: "HIGH_RISK_COUNTRY" as const,
      severity: "HIGH" as const,
      description:
        "Transaction is associated with a configured high-risk country.",
    };
  }

  return null;
};

const checkRapidMovement = async (
  customerId: string,
  currentTransactionId: string,
  timestamp: Date,
  currentAmount: number,
  thresholds: AMLThresholds
): Promise<AMLRuleResult | null> => {
  const windowStart = new Date(
    timestamp.getTime() -
      thresholds.rapidMovementWindowMinutes * 60 * 1000
  );

  const recentTransactions =
    await prisma.transaction.findMany({
      where: {
        customerId,
        id: {
          not: currentTransactionId,
        },
        timestamp: {
          gte: windowStart,
          lte: timestamp,
        },
      },
    });

  const recentTotal = recentTransactions.reduce(
    (total, transaction) =>
      total + Number(transaction.amount),
    currentAmount
  );

  if (
    recentTransactions.length + 1 >=
      thresholds.rapidMovementMinimumTransactions &&
    recentTotal >= thresholds.rapidMovementAmount
  ) {
    return {
      type: "RAPID_MOVEMENT" as const,
      severity: "HIGH" as const,
      description:
        "Customer has multiple transactions within a short time window.",
    };
  }

  return null;
};



const checkIncomeMismatch = (
  transaction: {
    amount: any;
    customer: { annualIncome: any };
  },
  thresholds: AMLThresholds
): AMLRuleResult | null => {
  const annualIncome = Number(transaction.customer.annualIncome);

  if (
    annualIncome > 0 &&
    Number(transaction.amount) >=
      annualIncome * thresholds.incomeMismatchPercentage
  ) {
    return {
      type: "INCOME_MISMATCH",
      severity: "HIGH",
      description:
        "Transaction amount is disproportionate to the customer's declared annual income.",
    };
  }

  return null;
};

export const analyzeTransaction = async (
  transactionId: string
) => {
  const thresholds = getAMLThresholds();
  const transaction =
    await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        customer: {
          select: {
            annualIncome: true,
          },
        },
      },
    });

  if (!transaction) {
    throw new Error("TRANSACTION_NOT_FOUND");
  }

  const windowStart = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  );
  const structuringTransactions =
    await prisma.transaction.findMany({
      where: {
        customerId: transaction.customerId,
        timestamp: {
          gte: windowStart,
        },
        id: {
          not: transaction.id,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

  const velocityWindowStart = new Date(
    Date.now() - VELOCITY_WINDOW_MINUTES * 60 * 1000
  );
  const recentTransactions =
    await prisma.transaction.findMany({
      where: {
        customerId: transaction.customerId,
        timestamp: {
          gte: velocityWindowStart,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

  const recentDeposits =
    await prisma.transaction.findMany({
      where: {
        customerId: transaction.customerId,
        type: "DEPOSIT",
        timestamp: {
          gte: new Date(
            Date.now() -
              RAPID_MOVEMENT_WINDOW_MINUTES * 60 * 1000
          ),
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

  const alerts: AMLRuleResult[] = [];

  if (
    transaction.type === "TRANSFER" ||
    transaction.type === "WITHDRAWAL"
  ) {
    for (const deposit of recentDeposits) {
      const depositAmount = Number(deposit.amount);
      const outgoingAmount = Number(transaction.amount);

      if (
        depositAmount > 0 &&
        outgoingAmount >= depositAmount * RAPID_MOVEMENT_RATIO
      ) {
        alerts.push({
          type: "RAPID_MOVEMENT",
          severity: "HIGH",
          description:
            `A large outgoing transaction occurred shortly ` +
            `after a deposit of ${depositAmount} ${deposit.currency}.`,
        });

        break;
      }
    }
  }

  if (
    recentTransactions.length >=
    VELOCITY_TRANSACTION_LIMIT
  ) {
    alerts.push({
      type: "UNUSUAL_ACTIVITY",
      severity: "HIGH",
      description:
        `The customer completed ${recentTransactions.length} ` +
        `transactions within ${VELOCITY_WINDOW_MINUTES} minutes.`,
    });
  }

  const STRUCTURING_AMOUNT_LIMIT = 100000;
  const STRUCTURING_TRANSACTION_COUNT = 3;

  const qualifyingTransactions = structuringTransactions.filter(
    tx => Number(tx.amount) < STRUCTURING_AMOUNT_LIMIT
  );

  if (
    Number(transaction.amount) < STRUCTURING_AMOUNT_LIMIT &&
    qualifyingTransactions.length + 1 >=
      STRUCTURING_TRANSACTION_COUNT
  ) {
    alerts.push({
      type: "STRUCTURING",
      severity: "HIGH",
      description:
        `Multiple transactions below ${STRUCTURING_AMOUNT_LIMIT} ` +
        `were detected for this customer within a 24-hour period.`,
    });
  }

  const largeTransaction =
    checkLargeTransaction(transaction, thresholds);

  if (largeTransaction) {
    alerts.push(largeTransaction);
  }

  const highRiskCountry =
    checkHighRiskCountry(transaction, thresholds);

  if (highRiskCountry) {
    alerts.push(highRiskCountry);
  }

  const rapidMovement =
    await checkRapidMovement(
      transaction.customerId,
      transaction.id,
      transaction.timestamp,
      Number(transaction.amount),
      thresholds
    );

  if (rapidMovement) {
    alerts.push(rapidMovement);
  }

  const incomeMismatch = checkIncomeMismatch(
    transaction,
    thresholds
  );

  if (incomeMismatch) {
    alerts.push(incomeMismatch);
  }

  const geographicWindowStart = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  );
  const geographicTransactions =
    await prisma.transaction.findMany({
      where: {
        customerId: transaction.customerId,
        timestamp: {
          gte: geographicWindowStart,
        },
      },
      select: {
        country: true,
      },
    });

  const countries = new Set(
    geographicTransactions.map(tx => tx.country)
  );

  if (countries.size >= 3) {
    alerts.push({
      type: "UNUSUAL_ACTIVITY",
      severity: "MEDIUM",
      description:
        `Transactions were detected across ${countries.size} ` +
        "different countries within 24 hours.",
    });
  }

  return alerts;
};

export const createAMLAlerts = async (
  transactionId: string
) => {
  const transaction =
    await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });

  if (!transaction) {
    throw new Error("TRANSACTION_NOT_FOUND");
  }

  const alerts =
    await analyzeTransaction(transactionId);

  const createdAlerts: Awaited<
    ReturnType<typeof prisma.aMLAlert.create>
  >[] = [];

  for (const alert of alerts) {
    const existing = await prisma.aMLAlert.findFirst({
      where: {
        transactionId: transaction.id,
        type: alert.type,
      },
    });

    if (existing) {
      continue;
    }

    try {
      const created = await prisma.aMLAlert.create({
        data: {
          customerId: transaction.customerId,
          transactionId: transaction.id,
          type: alert.type,
          severity: alert.severity,
          description: alert.description,
        },
      });

      createdAlerts.push(created);

      if (
        created.severity === "HIGH" ||
        created.severity === "CRITICAL"
      ) {
        await escalateAMLAlert(created.id);
      }
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          "code" in error &&
          error.code === "P2002"
        )
      ) {
        throw error;
      }
    }
  }

  if (createdAlerts.length > 0) {
    await createAuditLog({
      action: "AML_ALERTS_CREATED",
      entity: "Transaction",
      entityId: transaction.id,
      details: {
        alertCount: createdAlerts.length,
        alertTypes: createdAlerts.map(alert => alert.type),
      },
    });
  }

  return createdAlerts;
};

async function escalateAMLAlert(alertId: string) {
  const alert = await prisma.aMLAlert.findUnique({
    where: {
      id: alertId,
    },
    include: {
      customer: true,
      transaction: true,
    },
  });

  if (!alert) {
    throw new Error("AML_ALERT_NOT_FOUND");
  }

  if (alert.severity !== "HIGH" && alert.severity !== "CRITICAL") {
    return null;
  }

  // Prevent duplicate cases
  const existingCase = await prisma.aMLCase.findFirst({
    where: {
      alertId: alert.id,
    },
  });

  if (existingCase) {
    return existingCase;
  }

  const amlCase = await prisma.aMLCase.create({
    data: {
      alertId: alert.id,
      customerId: alert.customerId,
      status: "OPEN",
      priority: alert.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
      summary: alert.description,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "AML_ALERT_ESCALATED",
      entity: "AMLAlert",
      entityId: alert.id,
      details: {
        severity: alert.severity,
        caseId: amlCase.id,
        customerId: alert.customerId,
      },
    },
  });

  return amlCase;
}
