import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

interface CreateAuditLogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export const createAuditLog = async ({
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress,
}: CreateAuditLogParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};