import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Foundation-level auth guard. Detailed role-based access control is
 * out of scope for this step (see Step 33.4) — this only distinguishes
 * authenticated vs. unauthenticated vs. still-initializing.
 */
function ProtectedRoute() {
  const { status } = useAuth();

  if (status === "initializing") {
    return (
      <div className="auth-loading" role="status">
        Checking your session…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
