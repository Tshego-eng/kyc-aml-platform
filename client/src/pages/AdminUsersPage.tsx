import { useEffect, useState } from "react";
import { getUsers, updateUserRole } from "../services/user.service";
import { ApiError } from "../types/api";
import type { AdminUser } from "../types/user";
import type { UserRole } from "../types/auth";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, humanizeLabel } from "../utils/format";

const ROLES: UserRole[] = ["ADMIN", "COMPLIANCE_OFFICER", "ANALYST", "VIEWER"];

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; users: AdminUser[] };

async function fetchState(): Promise<PageState> {
  try {
    const res = await getUsers();
    return { phase: "ready", users: res.users };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Unable to load users.";
    return { phase: "error", message };
  }
}

function roleTone(role: UserRole) {
  if (role === "ADMIN") return "negative" as const;
  if (role === "COMPLIANCE_OFFICER") return "warning" as const;
  if (role === "ANALYST") return "positive" as const;
  return "neutral" as const;
}

/**
 * Admin-only user & role management (Step 41.7). Backend source of
 * truth: GET /api/users (list) and PATCH /api/users/:id/role
 * (server/src/routes/user.routes.ts) — both newly added this step since
 * no such endpoint existed previously; both are authorize("ADMIN") only,
 * and role-change is rejected server-side (409) if it would demote the
 * platform's last remaining Admin. This page only presents that
 * behavior — it never overrides it.
 */
function AdminUsersPage() {
  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowSuccess, setRowSuccess] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetchState().then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = () => {
    setState({ phase: "loading" });
    fetchState().then(setState);
  };

  const handleRoleChange = async (user: AdminUser) => {
    const nextRole = pendingRoles[user.id] ?? user.role;
    if (nextRole === user.role) {
      return;
    }

    if (nextRole === "ADMIN") {
      const confirmed = window.confirm(
        `Grant ${user.name} Admin access? This is a privileged role with full platform access.`
      );
      if (!confirmed) {
        return;
      }
    }

    setRowErrors((prev) => ({ ...prev, [user.id]: "" }));
    setRowSuccess((prev) => ({ ...prev, [user.id]: "" }));
    setSavingId(user.id);
    try {
      const res = await updateUserRole(user.id, nextRole);
      setRowSuccess((prev) => ({
        ...prev,
        [user.id]: `Role updated to ${humanizeLabel(res.user.role)}.`,
      }));
      setState((prev) =>
        prev.phase === "ready"
          ? {
              phase: "ready",
              users: prev.users.map((u) =>
                u.id === user.id ? res.user : u
              ),
            }
          : prev
      );
    } catch (error) {
      setRowErrors((prev) => ({
        ...prev,
        [user.id]:
          error instanceof ApiError
            ? error.message
            : "Unable to update this user's role.",
      }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__heading">Users</h1>
          <p className="dashboard__subheading">
            {state.phase === "ready"
              ? `${state.users.length.toLocaleString()} accounts`
              : "Administrative user and role management"}
          </p>
        </div>
        <div className="dashboard__header-actions">
          <button
            type="button"
            className="dashboard__refresh"
            onClick={handleRetry}
          >
            Refresh
          </button>
        </div>
      </div>

      {state.phase === "loading" && (
        <p className="customers-page__loading">Loading users…</p>
      )}

      {state.phase === "error" && (
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load users — {state.message}
          </p>
          <button
            type="button"
            className="dashboard-error__retry"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}

      {state.phase === "ready" && (
        <div className="customer-table-wrapper">
          <table className="customer-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Created</th>
                <th scope="col">Change role</th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((user) => {
                const pending = pendingRoles[user.id] ?? user.role;
                return (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <StatusBadge
                        label={humanizeLabel(user.role)}
                        tone={roleTone(user.role)}
                      />
                    </td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>
                      <div className="user-role-cell">
                        <select
                          className="customers-page__filter"
                          value={pending}
                          onChange={(event) =>
                            setPendingRoles((prev) => ({
                              ...prev,
                              [user.id]: event.target.value as UserRole,
                            }))
                          }
                          aria-label={`Change role for ${user.name}`}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {humanizeLabel(role)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="profile-panel__action"
                          onClick={() => handleRoleChange(user)}
                          disabled={
                            savingId === user.id || pending === user.role
                          }
                        >
                          {savingId === user.id ? "Saving…" : "Change Role"}
                        </button>
                        {rowError(rowErrors, user.id)}
                        {rowNote(rowSuccess, user.id)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function rowError(errors: Record<string, string>, id: string) {
  const message = errors[id];
  return message ? <p className="profile-panel__error">{message}</p> : null;
}

function rowNote(notes: Record<string, string>, id: string) {
  const message = notes[id];
  return message ? <p className="profile-panel__note">{message}</p> : null;
}

export default AdminUsersPage;
