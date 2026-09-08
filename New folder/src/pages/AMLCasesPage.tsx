import { useEffect, useState } from "react";
import { getAMLCases } from "../services/aml.service";
import { ApiError } from "../types/api";
import type { AMLCaseListItem, AMLCaseStatus } from "../types/aml";
import CaseTable from "../components/aml/CaseTable";

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; cases: AMLCaseListItem[] };

const STATUS_FILTERS: Array<{ value: "ALL" | AMLCaseStatus; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "FALSE_POSITIVE", label: "False positive" },
];

async function fetchCasesState(status: "ALL" | AMLCaseStatus): Promise<PageState> {
  try {
    const res = await getAMLCases(status === "ALL" ? undefined : status);
    return { phase: "ready", cases: res.cases };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Unable to load AML cases.";
    return { phase: "error", message };
  }
}

/**
 * AML Cases list. Status filtering is server-side
 * (GET /api/aml-cases?status=) — the only filter the backend supports.
 */
function AMLCasesPage() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | AMLCaseStatus>("ALL");
  const [state, setState] = useState<PageState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchCasesState(statusFilter).then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const handleFilterChange = (value: "ALL" | AMLCaseStatus) => {
    setStatusFilter(value);
    setState({ phase: "loading" });
  };

  const handleRetry = () => {
    setState({ phase: "loading" });
    fetchCasesState(statusFilter).then(setState);
  };

  return (
    <section className="customers-page">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__heading">AML Cases</h1>
          <p className="dashboard__subheading">
            {state.phase === "ready"
              ? `${state.cases.length.toLocaleString()} cases`
              : "Anti-money-laundering investigation cases"}
          </p>
        </div>
      </div>

      <div className="customers-page__controls">
        <select
          className="customers-page__filter"
          value={statusFilter}
          onChange={(event) =>
            handleFilterChange(event.target.value as "ALL" | AMLCaseStatus)
          }
          aria-label="Filter by case status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {state.phase === "loading" && (
        <p className="customers-page__loading">Loading cases…</p>
      )}

      {state.phase === "error" && (
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load AML cases — {state.message}
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

      {state.phase === "ready" && <CaseTable cases={state.cases} />}
    </section>
  );
}

export default AMLCasesPage;
