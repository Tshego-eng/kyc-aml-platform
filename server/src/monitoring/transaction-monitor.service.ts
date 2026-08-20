import prisma from "../lib/prisma";
import { RiskLevel, AMLAlertType } from "@prisma/client";

export interface MonitoringResult {
  flagged: boolean;
  alerts: {
    type: AMLAlertType;
    severity: RiskLevel;
    description: string;
  }[];
}

export async function monitorTransaction(
  transactionId: string
): Promise<MonitoringResult> {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
    include: {
      customer: true,
    },
  });

  if (!transaction) {
    throw new Error("TRANSACTION_NOT_FOUND");
  }

  const alerts: MonitoringResult["alerts"] = [];

  const LARGE_TRANSACTION_THRESHOLD = 100000;

if (Number(transaction.amount) >= LARGE_TRANSACTION_THRESHOLD) {
  alerts.push({
    type: "LARGE_TRANSACTION",
    severity: "HIGH",
    description:
      `Transaction amount of ${transaction.amount} ${transaction.currency} ` +
      `exceeds the monitoring threshold of ${LARGE_TRANSACTION_THRESHOLD}.`,
  });
}

for (const alert of alerts) {
  const existingAlert = await prisma.aMLAlert.findFirst({
    where: {
      transactionId: transaction.id,
      type: alert.type,
      status: {
        in: ["OPEN", "INVESTIGATING", "ESCALATED"],
      },
    },
  });

  if (existingAlert) {
    continue;
  }

  await prisma.aMLAlert.create({
    data: {
      customerId: transaction.customerId,
      transactionId: transaction.id,
      type: alert.type,
      severity: alert.severity,
      status: "OPEN",
      description: alert.description,
    },
  });
}

return {
  flagged: alerts.length > 0,
  alerts,
};
}