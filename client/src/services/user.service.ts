import { httpClient } from "./httpClient";
import type { UsersListResponse, UpdateUserRoleResponse } from "../types/user";
import type { UserRole } from "../types/auth";

// GET /api/users — ADMIN only (server/src/routes/user.routes.ts).
export function getUsers(): Promise<UsersListResponse> {
  return httpClient.get<UsersListResponse>("/users");
}

// PATCH /api/users/:id/role — ADMIN only, body { role }. The backend
// rejects demoting the platform's last remaining Admin with a 409.
export function updateUserRole(
  userId: string,
  role: UserRole
): Promise<UpdateUserRoleResponse> {
  return httpClient.patch<UpdateUserRoleResponse>(`/users/${userId}/role`, {
    role,
  });
}
