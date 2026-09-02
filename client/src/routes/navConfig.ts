import type { UserRole } from "../types/auth";

export type NavRoles = UserRole[] | "any-authenticated";

export interface NavItem {
  label: string;
  path: string;
  allowedRoles: NavRoles;
}

/**
 * Single source of truth for which authenticated routes exist and who
 * can see them in navigation. Real dashboard/customer/AML/etc. entries
 * get added here in later steps; this is the foundation only, plus one
 * real example wired to an actual backend-protected endpoint.
 */
export const navItems: NavItem[] = [
  { label: "Home", path: "/", allowedRoles: "any-authenticated" },
  {
    label: "Admin diagnostics",
    path: "/rbac-check/admin",
    // Mirrors authorize("ADMIN") on GET /api/rbac/admin
    // (server/src/routes/rbac.routes.ts) — kept in sync manually since
    // roles are enforced independently on the backend regardless of
    // what this list says.
    allowedRoles: ["ADMIN"],
  },
];

export function canSeeNavItem(
  item: NavItem,
  hasAnyRole: (roles: UserRole[]) => boolean
): boolean {
  if (item.allowedRoles === "any-authenticated") {
    return true;
  }
  return hasAnyRole(item.allowedRoles);
}
