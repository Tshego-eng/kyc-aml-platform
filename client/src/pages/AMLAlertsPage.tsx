import { useEffect, useState } from "react";
import { getAMLAlerts } from "../services/aml.service";
import { ApiError } from "../types/api";
import type { AMLAlertListItem } from "../types/aml";
import type { AlertStatus } from "../types/dashboard";
import AlertTable from "../components/aml/AlertTable";

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; alerts: AMLAlertListItem[] };

const STATUS_FILTERS: Array<{ value: "ALL" | AlertStatus; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "FALSE_POSITIVE", label: "False positive" },
];

async function fetchAlertsState(status: "ALL" | AlertStatus): Promise<PageState> {
  try {
    const res = await getAMLAlerts(status === "ALL" ? undefined : status);
    return { phase: "ready", alerts: res.alerts };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Unable to load AML alerts.";
    return { phase: "error", message };
  }
}

/**
 * AML Alerts list. Status filtering is server-side
 * (GET /api/aml-alerts?status=) — the only filter the backend supports;
 * there is no search or pagination on this endpoint.
 */
function AMLAlertsPage() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | AlertStatus>("ALL");
  const [state, setState] = useState<PageState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchAlertsState(statusFilter).then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const handleFilterChange = (value: "ALL" | AlertStatus) => {
    setStatusFilter(value);
    setState({ phase: "loading" });
  };

  const handleRetry = () => {
    setState({ phase: "loading" });
    fetchAlertsState(statusFilter).then(setState);
  };

  return (
    <section className="customers-page">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__heading">AML Alerts</h1>
          <p className="dashboard__subheading">
            {state.phase === "ready"
              ? `${state.alerts.length.toLocaleString()} alerts`
              : "Anti-money-laundering monitoring alerts"}
          </p>
        </div>
      </div>

      <div className="customers-page__controls">
        <select
          className="customers-page__filter"
          value={statusFilter}
          onChange={(event) =>
            handleFilterChange(event.target.value as "ALL" | AlertStatus)
          }
          aria-label="Filter by alert status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {state.phase === "loading" && (
        <p className="customers-page__loading">Loading alerts…</p>
      )}

      {state.phase === "error" && (
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load AML alerts — {state.message}
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

      {state.phase === "ready" && <AlertTable alerts={state.alerts} />}
    </section>
  );
}

export default AMLAlertsPage;
