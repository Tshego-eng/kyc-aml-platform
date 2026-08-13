import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json({
      logs,
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);

    return res.status(500).json({
      error: "Failed to fetch audit logs",
    });
  }
};