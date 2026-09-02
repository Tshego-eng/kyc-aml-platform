import { useEffect, useState } from "react";
import { httpClient } from "../services/httpClient";
import { ApiError } from "../types/api";

// Matches the literal response of server/src/controllers/rbac.controller.ts `adminTest`.
interface RbacTestResponse {
  message: string;
  user: { userId: string; email: string; role: string };
}

type CheckState =
  | { phase: "loading" }
  | { phase: "success"; message: string }
  | { phase: "error"; message: string };

/**
 * Foundation-only example route: restricted to ADMIN on both this
 * route's RoleRoute guard and the real backend (GET /api/rbac/admin),
 * so it proves frontend and backend RBAC agree rather than relying on
 * fake data.
 */
function RbacCheckPage() {
  const [state, setState] = useState<CheckState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    httpClient
      .get<RbacTestResponse>("/rbac/admin")
      .then((data) => {
        if (!cancelled) {
          setState({ phase: "success", message: data.message });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError ? error.message : "Request failed.";
        setState({ phase: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rbac-check">
      <h1 className="rbac-check__heading">Admin diagnostics</h1>
      <p className="rbac-check__body">
        This page is restricted to the ADMIN role on the frontend route
        guard and on the real backend endpoint it calls, so it doubles
        as an end-to-end RBAC check.
      </p>
      <div className="rbac-check__result">
        {state.phase === "loading" && "Checking backend authorization…"}
        {state.phase === "success" && `Backend response: ${state.message}`}
        {state.phase === "error" && `Backend error: ${state.message}`}
      </div>
    </section>
  );
}

export default RbacCheckPage;
