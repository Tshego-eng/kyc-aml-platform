import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { registerSchema } from "../schemas/auth.schema";

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
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const result = await loginUser(email, password);

    return res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(401).json({
      error: "Invalid email or password",
    });
  }
};