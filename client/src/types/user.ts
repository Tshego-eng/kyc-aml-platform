import type { UserRole } from "./auth";

// Matches userSummarySelect in server/src/services/user.service.ts
// exactly — never includes passwordHash.
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// GET /api/users
export interface UsersListResponse {
  users: AdminUser[];
}

// PATCH /api/users/:id/role
export interface UpdateUserRoleResponse {
  message: string;
  user: AdminUser;
}
