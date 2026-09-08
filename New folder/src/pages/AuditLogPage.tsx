import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAuditLogs } from "../services/audit.service";
import { ApiError } from "../types/api";
import type { RecentAuditLog } from "../types/dashboard";
import { formatDateTime, humanizeLabel } from "../utils/format";

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; logs: RecentAuditLog[] };

async function fetchState(): Promise<PageState> {
  try {
    const res = await getAuditLogs();
    return { phase: "ready", logs: res.logs };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Unable to load audit logs.";
    return { phase: "error", message };
  }
}

// Presentation-only grouping over the real `entity` field the backend
// returns — not a separate backend concept. Every entity value actually
// used across the codebase (grep for `entity: "..."` in every
// controller/service) maps to exactly one category here.
const ENTITY_CATEGORIES: Record<string, string> = {
  User: "Authentication & users",
  Customer: "Customer management",
  KYCCheck: "KYC",
  KYCReview: "KYC",
  AMLAlert: "AML",
  AMLCase: "AML",
  RiskAssessment: "Risk",
  RegulatoryReport: "Regulatory reporting",
  Transaction: "Transactions",
  Dashboard: "Dashboard views",
};

function categoryFor(entity: string): string {
  return ENTITY_CATEGORIES[entity] ?? entity;
}

// Only the three auth-related actions the backend actually audits
// (server/src/controllers/auth.controller.ts). There is no logout
// event: logout is a purely client-side action with no backend call.
const AUTH_ACTIONS = new Set([
  "USER_LOGIN_SUCCESS",
  "USER_LOGIN_FAILED",
  "USER_REGISTERED",
]);

function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// Drill-down links only where a real, existing route can resolve the
// entityId — several entity types (User, RegulatoryReport, KYCCheck,
// KYCReview, RiskAssessment, Transaction, Dashboard) have no standalone
// detail route anywhere in the app, so no link is offered for those.
function entityLink(entity: string, entityId: string | null): string | null {
  if (!entityId) return null;
  if (entity === "Customer") return `/customers/${entityId}`;
  if (entity === "AMLAlert") return `/aml-alerts/${entityId}`;
  if (entity === "AMLCase") return `/aml-cases/${entityId}`;
  return null;
}

/**
 * Audit & Administration (Step 40). The backend has exactly one audit
 * endpoint — GET /api/audit — with no query parameters, no pagination,
 * and a hard-coded limit of the most recent 100 events system-wide
 * (server/src/controllers/audit.controller.ts). Every filter, search,
 * category grouping, and "activity" view here operates client-side on
 * that same 100-row snapshot; none of it is server-side filtering.
 */
function AuditLogPage() {
  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const actorFilter = searchParams.get("actor");

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

  const categories = useMemo(() => {
    if (state.phase !== "ready") return [];
    return Array.from(
      new Set(state.logs.map((log) => categoryFor(log.entity)))
    ).sort();
  }, [state]);

  const filteredLogs = useMemo(() => {
    if (state.phase !== "ready") return [];
    const query = search.trim().toLowerCase();
    return state.logs.filter((log) => {
      if (actorFilter && log.user?.id !== actorFilter) return false;
      if (categoryFilter !== "ALL" && categoryFor(log.entity) !== categoryFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = `${log.user?.name ?? ""} ${log.user?.email ?? ""} ${
        log.action
      } ${log.entity}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [state, search, categoryFilter, actorFilter]);

  if (state.phase === "loading") {
    return (
      <section className="dashboard" aria-busy="true">
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__heading">Audit Logs</h1>
            <p className="dashboard__subheading">
              System activity across the compliance platform
            </p>
          </div>
        </div>
        <p className="customers-page__loading">Loading audit logs…</p>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="dashboard">
        <h1 className="dashboard__heading">Audit Logs</h1>
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load audit logs — {state.message}
          </p>
          <button
            type="button"
            className="dashboard-error__retry"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const { logs } = state;
  const eventsToday = logs.filter((log) => isToday(log.createdAt)).length;
  const authEvents = logs.filter((log) => AUTH_ACTIONS.has(log.action));
  const failedLogins = authEvents.filter(
    (log) => log.action === "USER_LOGIN_FAILED"
  ).length;

  const actorName = actorFilter
    ? logs.find((log) => log.user?.id === actorFilter)?.user?.name
    : null;

  return (
    <section className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__heading">Audit Logs</h1>
          <p className="dashboard__subheading">
            Most recent {logs.length.toLocaleString()} system-wide events
            (the backend does not paginate beyond this)
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

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-card__title">Events loaded</span>
          <span className="metric-card__value">{logs.length}</span>
          <span className="metric-card__description">
            Capped at the most recent 100
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-card__title">Events today</span>
          <span className="metric-card__value">{eventsToday}</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__title">Authentication events</span>
          <span className="metric-card__value">{authEvents.length}</span>
          <span className="metric-card__description">
            {failedLogins} failed login attempt{failedLogins === 1 ? "" : "s"}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-card__title">Categories represented</span>
          <span className="metric-card__value">{categories.length}</span>
        </div>
      </div>

      {actorFilter && (
        <div className="profile-panel__note">
          Showing activity for {actorName ?? "this user"} only.{" "}
          <button
            type="button"
            className="dashboard__refresh"
            onClick={() => setSearchParams({})}
          >
            Clear
          </button>
        </div>
      )}

      <div className="customers-page__controls">
        <input
          type="search"
          className="customers-page__search"
          placeholder="Search by actor, action, or entity"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search audit logs"
        />
        <select
          className="customers-page__filter"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="ALL">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="customer-table__empty">No audit events found.</p>
      ) : (
        <div className="customer-table-wrapper">
          <table className="customer-table">
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">IP address</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const link = entityLink(log.entity, log.entityId);
                return (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>
                      {log.user ? (
                        <button
                          type="button"
                          className="customer-table__link audit-actor-button"
                          onClick={() =>
                            setSearchParams({ actor: log.user!.id })
                          }
                        >
                          {log.user.name}
                        </button>
                      ) : (
                        "System / unauthenticated"
                      )}
                    </td>
                    <td>{humanizeLabel(log.action)}</td>
                    <td>
                      {log.entity}
                      {log.entityId ? ` #${log.entityId.slice(0, 8)}…` : ""}
                    </td>
                    <td className="customer-table__mono">
                      {log.ipAddress ?? "—"}
                    </td>
                    <td>
                      <Link to={`/audit/${log.id}`}>Details</Link>
                      {link && <> · <Link to={link}>View</Link></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">Roles &amp; access</h2>
        <p className="customer-table__empty">
          The backend has no user-listing, user-management, or role-editing
          endpoints — roles are fixed at registration and enforced entirely
          by middleware. This is a read-only summary of the actual
          <code>authorize()</code> rules found across the backend source,
          not an editable permission system.
        </p>
        <div className="customer-table-wrapper">
          <table className="customer-table">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Access</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Admin</td>
                <td>
                  Full access to every section, including audit logs,
                  regulatory reporting, and case decision validation.
                </td>
              </tr>
              <tr>
                <td>Compliance Officer</td>
                <td>
                  Same as Admin for compliance operations: customers, KYC,
                  AML alerts/cases, case management actions, regulatory
                  reporting, and audit logs.
                </td>
              </tr>
              <tr>
                <td>Analyst</td>
                <td>
                  Read/investigate access to customers, KYC, AML alerts and
                  cases, and risk intelligence, but cannot assign cases,
                  change case status, add notes/evidence, validate
                  decisions, create regulatory reports, or view audit logs.
                </td>
              </tr>
              <tr>
                <td>Viewer</td>
                <td>
                  Dashboard access only — no customer, KYC, AML, risk, or
                  audit access.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AuditLogPage;
