// Mirrors prisma/schema.prisma `enum UserRole`.
export type UserRole = "ADMIN" | "COMPLIANCE_OFFICER" | "ANALYST" | "VIEWER";

// Matches the `user` object returned by both POST /api/auth/login and
// POST /api/auth/register (server/src/services/auth.service.ts).
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Matches server/src/schemas/auth.schema.ts / controllers/auth.controller.ts
// request body for POST /api/auth/login.
export interface LoginRequest {
  email: string;
  password: string;
}

// Matches the literal response body of POST /api/auth/login
// (server/src/controllers/auth.controller.ts `login`).
export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

// Matches the response body of GET /api/auth/me
// (server/src/controllers/auth.controller.ts `getCurrentUser`).
export interface CurrentUserResponse {
  user: AuthUser & { createdAt: string };
}
