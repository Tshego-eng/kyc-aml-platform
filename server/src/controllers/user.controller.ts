import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { listUsers, updateUserRole, VALID_ROLES } from "../services/user.service";
import { createAuditLog } from "../services/audit.service";

export const getUsersController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const users = await listUsers();
    return res.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const updateUserRoleController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id: rawId } = req.params;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { role } = req.body;

    if (!id) {
      return res.status(400).json({
        error: "User id is required",
      });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `role must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const { updated, previousRole } = await updateUserRole(id, role);

    await createAuditLog({
      userId: req.user?.userId,
      action: "USER_ROLE_CHANGED",
      entity: "User",
      entityId: id,
      details: {
        targetEmail: updated.email,
        previousRole,
        newRole: role,
      },
      ipAddress: req.ip,
    });

    return res.json({
      message: "User role updated successfully",
      user: updated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        error: "User not found",
      });
    }

    if (error instanceof Error && error.message === "LAST_ADMIN_PROTECTED") {
      return res.status(409).json({
        error: "Cannot change the role of the last remaining Admin",
      });
    }

    console.error("Update user role error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
