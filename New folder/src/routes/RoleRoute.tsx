import { Navigate, Outlet } from "react-router-dom";
import { useRole } from "../hooks/useRole";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import type { UserRole } from "../types/auth";

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

/**
 * Always nested under <ProtectedRoute>, which already handles the
 * unauthenticated case (redirect to /login) and the initializing case.
 * This guard only needs to decide authenticated-but-unauthorized vs.
 * authorized, per 33.4.3: unauthorized users see an in-place 403, not
 * a redirect to login.
 */
function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { role, hasAnyRole } = useRole();

  if (!role) {
    // Defensive fallback only; ProtectedRoute should already have
    // redirected before this ever renders without a role.
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(allowedRoles)) {
    return <AccessDeniedPage allowedRoles={allowedRoles} />;
  }

  return <Outlet />;
}

export default RoleRoute;
