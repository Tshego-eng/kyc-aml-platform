import prisma from "../lib/prisma";
import { createAuditLog } from "./audit.service";

export const getAMLAlerts = async (status?: string) => {
  const alerts = await prisma.aMLAlert.findMany({
    where: status
      ? {
          status: status as any,
        }
      : undefined,

    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
        },
      },

      transaction: {
        select: {
          id: true,
          amount: true,
          currency: true,
          country: true,
          type: true,
          status: true,
          timestamp: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return alerts;
};

export const getAMLAlertById = async (
  alertId: string
) => {
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
    throw new Error("ALERT_NOT_FOUND");
  }

  return alert;
};

const isValidStatusTransition = (
  currentStatus: string,
  newStatus: string
) => {
  const allowedTransitions: Record<
    string,
    string[]
  > = {
    OPEN: [
      "INVESTIGATING",
      "FALSE_POSITIVE",
    ],

    INVESTIGATING: [
      "ESCALATED",
      "RESOLVED",
      "FALSE_POSITIVE",
    ],

    ESCALATED: [
      "INVESTIGATING",
      "RESOLVED",
    ],

    RESOLVED: [],

    FALSE_POSITIVE: [],
  };

  return allowedTransitions[
    currentStatus
  ]?.includes(newStatus);
};

export const updateAMLAlertStatus = async (
  alertId: string,
  status:
    | "OPEN"
    | "INVESTIGATING"
    | "ESCALATED"
    | "RESOLVED"
    | "FALSE_POSITIVE",
  userId?: string,
  ipAddress?: string
) => {
  const alert = await prisma.aMLAlert.findUnique({
    where: {
      id: alertId,
    },
  });


  if (!alert) {
    throw new Error("ALERT_NOT_FOUND");
  }

  if (
    alert.status === status
  ) {
    throw new Error("STATUS_ALREADY_SET");
  }

  if (
    !isValidStatusTransition(
      alert.status,
      status
    )
  ) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }

  const updatedAlert =
    await prisma.aMLAlert.update({
      where: {
        id: alertId,
      },

      data: {
        status,
      },
    });

  await createAuditLog({
    userId,
    action: "AML_ALERT_STATUS_UPDATED",
    entity: "AMLAlert",
    entityId: alertId,
    details: {
      previousStatus: alert.status,
      newStatus: status,
    },
    ipAddress,
  });

  return updatedAlert;
};

