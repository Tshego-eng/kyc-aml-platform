import prisma from "../lib/prisma";
import { UserRole } from "../middleware/rbac.middleware";

export const VALID_ROLES: UserRole[] = [
  "ADMIN",
  "COMPLIANCE_OFFICER",
  "ANALYST",
  "VIEWER",
];

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export const listUsers = async () => {
  return prisma.user.findMany({
    select: userSummarySelect,
    orderBy: { createdAt: "asc" as const },
  });
};

export const updateUserRole = async (userId: string, newRole: UserRole) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new Error("USER_NOT_FOUND");
  }

  // Prevent demoting the platform's last remaining Admin — whether by
  // another Admin or by the Admin acting on themselves. If other Admins
  // exist, this is unaffected.
  if (targetUser.role === "ADMIN" && newRole !== "ADMIN") {
    const remainingAdmins = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    if (remainingAdmins <= 1) {
      throw new Error("LAST_ADMIN_PROTECTED");
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: userSummarySelect,
  });

  return { updated, previousRole: targetUser.role };
};
