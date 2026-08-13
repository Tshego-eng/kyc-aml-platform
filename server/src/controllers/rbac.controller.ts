import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const adminTest = (
  req: AuthenticatedRequest,
  res: Response
) => {
  res.json({
    message: "You have ADMIN access",
    user: req.user,
  });
};

export const complianceTest = (
  req: AuthenticatedRequest,
  res: Response
) => {
  res.json({
    message: "You have COMPLIANCE OFFICER access",
    user: req.user,
  });
};

export const analystTest = (
  req: AuthenticatedRequest,
  res: Response
) => {
  res.json({
    message: "You have ANALYST access",
    user: req.user,
  });
};