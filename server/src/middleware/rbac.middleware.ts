import { Response, NextFunction } from "express";
import {
  AuthenticatedRequest,
} from "./auth.middleware";
import { createAuditLog } from "../services/audit.service";

export type UserRole =
  | "ADMIN"
  | "COMPLIANCE_OFFICER"
  | "ANALYST"
  | "VIEWER";

export const authorize = (...allowedRoles: UserRole[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

  if (!allowedRoles.includes(req.user.role as UserRole)) {

    await createAuditLog({
    userId: req.user.userId,
    action: "AUTHORIZATION_DENIED",
    entity: "Route",
    details: {
      role: req.user.role,
      allowedRoles,
      path: req.originalUrl,
      method: req.method,
    },
    ipAddress: req.ip,
  });

  return res.status(403).json({
    error: "You do not have permission to access this resource",
  });
} await createAuditLog({
  userId: req.user.userId,
  action: "AUTHORIZATION_GRANTED",
  entity: "Route",
  details: {
    role: req.user.role,
    path: req.originalUrl,
    method: req.method,
  },
  ipAddress: req.ip,
});

    next();
  };
};