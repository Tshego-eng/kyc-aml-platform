import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { registerSchema } from "../schemas/auth.schema";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";
import { createAuditLog } from "../services/audit.service";

export const register = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.flatten().fieldErrors,
      });
    }

    // Register user
    const result = await registerUser(validationResult.data);

    await createAuditLog({
      userId: result.user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: result.user.id,
      details: {
        email: result.user.email,
        role: result.user.role,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: "User registered successfully",
      ...result,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const emailFromRequest = typeof req.body?.email === "string" ? req.body.email : undefined;

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const result = await loginUser(email, password);

    await createAuditLog({
      userId: result.user.id,
      action: "USER_LOGIN_SUCCESS",
      entity: "User",
      entityId: result.user.id,
      details: {
        email: result.user.email,
      },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    console.error("Login error:", error);

    await createAuditLog({
      action: "USER_LOGIN_FAILED",
      entity: "User",
      details: {
        email: emailFromRequest,
        reason: "Invalid credentials",
      },
      ipAddress: req.ip,
    });

    return res.status(401).json({
      error: "Invalid email or password",
    });
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.json({
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}