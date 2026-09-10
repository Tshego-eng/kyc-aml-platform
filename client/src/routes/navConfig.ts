import type { UserRole } from "../types/auth";

export type NavRoles = UserRole[] | "any-authenticated";

export interface NavItem {
  label: string;
  path: string;
  allowedRoles: NavRoles;
  /** Bootstrap Icons class (e.g. "bi-speedometer2"), purely presentational. */
  icon: string;
  /** Sidebar section heading this item is grouped under. */
  section: string;
}

/**
 * Single source of truth for which authenticated routes exist, who can
 * see them (canSeeNavItem), and how they're grouped/iconified in the
 * sidebar. Section/icon are presentational only — RBAC filtering below
 * is unchanged from earlier steps.
 */
export const navItems: NavItem[] = [
  {
    label: "Home",
    path: "/",
    allowedRoles: "any-authenticated",
    icon: "bi-house",
    section: "Overview",
  },
  {
    label: "Dashboard",
    path: "/dashboard",
    // Backend's dashboardReadRoles (server/src/routes/dashboard.routes.ts)
    // is ADMIN, COMPLIANCE_OFFICER, ANALYST, VIEWER — every role that
    // currently exists, so this is equivalent to "any-authenticated".
    allowedRoles: "any-authenticated",
    icon: "bi-speedometer2",
    section: "Overview",
  },
  {
    label: "Customers",
    path: "/customers",
    // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST") on
    // server/src/routes/customer.routes.ts and kyc-review.routes.ts —
    // VIEWER cannot access customer/KYC data.
    allowedRoles: ["ADMIN", "COMPLIANCE_OFFICER", "ANALYST"],
    icon: "bi-people",
    section: "Customer & KYC",
  },
  {
    label: "AML Alerts",
    path: "/aml-alerts",
    // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST") on
    // server/src/routes/aml-alert.routes.ts.
    allowedRoles: ["ADMIN", "COMPLIANCE_OFFICER", "ANALYST"],
    icon: "bi-exclamation-triangle",
    section: "AML Operations",
  },
  {
    label: "AML Cases",
    path: "/aml-cases",
    // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST") on
    // server/src/routes/aml-case.routes.ts (read access; assign/status/
    // notes/evidence are further restricted to ADMIN/COMPLIANCE_OFFICER
    // within the case detail page itself).
    allowedRoles: ["ADMIN", "COMPLIANCE_OFFICER", "ANALYST"],
    icon: "bi-briefcase",
    section: "AML Operations",
  },
  {
    label: "Risk Intelligence",
    path: "/risk-intelligence",
    // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST") on
    // GET /api/dashboard/risk-intelligence specifically (riskIntelligenceRoles
    // in server/src/routes/dashboard.routes.ts) — stricter than the other
    // dashboard read endpoints, which also allow VIEWER.
    allowedRoles: ["ADMIN", "COMPLIANCE_OFFICER", "ANALYST"],
    icon: "bi-graph-up-arrow",
    section: "Compliance",
  },
  {
    label: "Audit Logs",
    path: "/audit",
    // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER") on GET /api/audit
    // (server/src/routes/audit.routes.ts) — the only role pair with any
    // audit access at all; ANALYST and VIEWER cannot see this section.
    allowedRoles: ["ADMIN", "COMPLIANCE_OFFICER"],
    icon: "bi-clock-history",
    section: "Administration",
  },
  {
    label: "User Management",
    path: "/admin/users",
    // Mirrors authorize("ADMIN") on GET /api/users and
    // PATCH /api/users/:id/role (server/src/routes/user.routes.ts).
    allowedRoles: ["ADMIN"],
    icon: "bi-people-fill",
    section: "Administration",
  },
  {
    label: "Admin diagnostics",
    path: "/rbac-check/admin",
    // Mirrors authorize("ADMIN") on GET /api/rbac/admin
    // (server/src/routes/rbac.routes.ts) — kept in sync manually since
    // roles are enforced independently on the backend regardless of
    // what this list says.
    allowedRoles: ["ADMIN"],
    icon: "bi-shield-check",
    section: "Administration",
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
