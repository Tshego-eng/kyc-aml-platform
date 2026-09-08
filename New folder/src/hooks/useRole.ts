import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

interface UseRoleResult {
  role: UserRole | null;
  hasRole: (target: UserRole) => boolean;
  hasAnyRole: (targets: UserRole[]) => boolean;
}

/**
 * Centralized authorization helper. Anything that needs to branch on
 * the current user's role (route guards, nav filtering, future
 * component-level checks) should go through this rather than reading
 * `user.role` directly, so the comparison logic lives in one place.
 */
export function useRole(): UseRoleResult {
  const { user } = useAuth();
  const role = user?.role ?? null;

  function hasRole(target: UserRole): boolean {
    return role === target;
  }

  function hasAnyRole(targets: UserRole[]): boolean {
    return role !== null && targets.includes(role);
  }

  return { role, hasRole, hasAnyRole };
}
