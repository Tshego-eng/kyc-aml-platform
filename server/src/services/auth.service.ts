import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { generateToken } from "../utils/jwt";
import { RegisterInput } from "../schemas/auth.schema";

export const registerUser = async (data: RegisterInput) => {
  const { name, email, password } = data;

  // Check if the email already exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create the user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ANALYST",
    },
  });

  // Generate JWT
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// -------------------------
// LOGIN
// -------------------------

export const loginUser = async (
  email: string,
  password: string
) => {
  // Find the user
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase().trim(),
    },
  });

  // Don't reveal whether the email exists
  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // Compare supplied password with stored password hash
  const passwordMatch = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatch) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // Generate JWT
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
