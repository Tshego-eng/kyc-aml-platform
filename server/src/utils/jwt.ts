import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

// Previously hardcoded to "1h" regardless of this env var, even though
// it was already documented in .env.example — now actually read, with
// the same "1h" default preserved if unset so existing behavior doesn't
// change for anyone who hasn't set it.
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "1h") as SignOptions["expiresIn"];

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};