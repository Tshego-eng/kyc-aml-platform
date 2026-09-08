import { Link } from "react-router-dom";
import { useRole } from "../hooks/useRole";
import type { UserRole } from "../types/auth";

interface AccessDeniedPageProps {
  allowedRoles?: UserRole[];
}

function AccessDeniedPage({ allowedRoles }: AccessDeniedPageProps) {
  const { role } = useRole();

  return (
    <section className="access-denied">
      <p className="access-denied__code">403</p>
      <h1 className="access-denied__heading">Access denied</h1>
      <p className="access-denied__body">
        {role
          ? `You're signed in, but your role (${role}) doesn't have permission to view this page.`
          : "You don't have permission to view this page."}
        {allowedRoles && allowedRoles.length > 0 && (
          <>
            {" "}
            This page requires the{" "}
            {allowedRoles.length > 1 ? "roles" : "role"}: {allowedRoles.join(", ")}.
          </>
        )}
      </p>
      <Link className="access-denied__link" to="/">
        Return to the workspace home
      </Link>
    </section>
  );
}

export default AccessDeniedPage;
