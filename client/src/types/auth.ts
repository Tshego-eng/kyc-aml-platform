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

// Matches server/src/schemas/auth.schema.ts `registerSchema` exactly —
// only name/email/password. There is deliberately no `role` field: the
// backend's Zod schema silently strips any unrecognized key (Zod's
// default "strip" behavior), and registerUser() hardcodes role:
// "ANALYST" regardless of what's sent, so a role could never be
// self-assigned even if this type allowed one.
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// Matches the literal response body of POST /api/auth/register
// (server/src/controllers/auth.controller.ts `register`) — same shape
// as login's response, since registerUser() also returns { token, user }.
export interface RegisterResponse {
  message: string;
  token: string;
  user: AuthUser;
}
