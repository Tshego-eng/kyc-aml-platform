import prisma from "../lib/prisma";

const LARGE_TRANSACTION_THRESHOLD = 100000;

const RAPID_MOVEMENT_WINDOW_MINUTES = 30;

const RAPID_MOVEMENT_THRESHOLD = 50000;

const HIGH_RISK_COUNTRIES = [
  "CountryA",
  "CountryB",
  "CountryC",
];

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

  return transaction;
};

const checkLargeTransaction = (
  transaction: {
    amount: any;
  }
) => {
  if (
    Number(transaction.amount) >=
    LARGE_TRANSACTION_THRESHOLD
  ) {
    return {
      type: "LARGE_TRANSACTION" as const,
      severity: "HIGH" as const,
      description:
        "Transaction exceeds the configured large transaction threshold.",
    };
  }

  return null;
};

const checkHighRiskCountry = (
  transaction: {
    country: string;
  }
) => {
  const isHighRisk = HIGH_RISK_COUNTRIES.some(
    country =>
      country.toLowerCase() ===
      transaction.country.toLowerCase()
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
  timestamp: Date
) => {
  const windowStart = new Date(
    timestamp.getTime() -
      RAPID_MOVEMENT_WINDOW_MINUTES * 60 * 1000
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
    0
  );

  if (
    recentTotal >= RAPID_MOVEMENT_THRESHOLD
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

export const analyzeTransaction = async (
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

  const alerts = [];

  const largeTransaction =
    checkLargeTransaction(transaction);

  if (largeTransaction) {
    alerts.push(largeTransaction);
  }

  const highRiskCountry =
    checkHighRiskCountry(transaction);

  if (highRiskCountry) {
    alerts.push(highRiskCountry);
  }

  const rapidMovement =
    await checkRapidMovement(
      transaction.customerId,
      transaction.id,
      transaction.timestamp
    );

  if (rapidMovement) {
    alerts.push(rapidMovement);
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

  const createdAlerts = [];

  for (const alert of alerts) {
    const created =
      await prisma.aMLAlert.create({
        data: {
          customerId: transaction.customerId,
          transactionId: transaction.id,
          type: alert.type,
          severity: alert.severity,
          description: alert.description,
        },
      });

    createdAlerts.push(created);
  }

  return createdAlerts;
};