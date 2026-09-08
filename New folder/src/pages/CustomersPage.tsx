import { useEffect, useMemo, useState } from "react";
import { getCustomers } from "../services/customer.service";
import { ApiError } from "../types/api";
import type { Customer } from "../types/customer";
import type { KycStatus } from "../types/dashboard";
import CustomerTable from "../components/customers/CustomerTable";

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; customers: Customer[] };

const KYC_STATUS_FILTERS: Array<{ value: "ALL" | KycStatus; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

async function fetchCustomersState(): Promise<PageState> {
  try {
    const res = await getCustomers();
    return { phase: "ready", customers: res.customers };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Unable to load customers.";
    return { phase: "error", message };
  }
}

/**
 * Customer list. Search and KYC-status filtering are client-side —
 * GET /api/customers has no query-parameter support on the backend
 * (server/src/controllers/customer.controller.ts ignores req.query),
 * and there is no pagination either, so the full list is fetched once
 * and filtered here.
 */
function CustomersPage() {
  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | KycStatus>("ALL");

  useEffect(() => {
    let cancelled = false;
    fetchCustomersState().then((result) => {
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
    fetchCustomersState().then(setState);
  };

  const filteredCustomers = useMemo(() => {
    if (state.phase !== "ready") {
      return [];
    }
    const query = search.trim().toLowerCase();
    return state.customers.filter((customer) => {
      const matchesStatus =
        statusFilter === "ALL" || customer.kycStatus === statusFilter;
      if (!matchesStatus) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${customer.firstName} ${customer.lastName} ${
        customer.email ?? ""
      } ${customer.idNumber}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [state, search, statusFilter]);

  return (
    <section className="customers-page">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__heading">Customers</h1>
          <p className="dashboard__subheading">
            {state.phase === "ready"
              ? `${state.customers.length.toLocaleString()} customers on file`
              : "Compliance customer records"}
          </p>
        </div>
      </div>

      <div className="customers-page__controls">
        <input
          type="search"
          className="customers-page__search"
          placeholder="Search by name, email, or ID number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search customers"
        />
        <select
          className="customers-page__filter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "ALL" | KycStatus)
          }
          aria-label="Filter by KYC status"
        >
          {KYC_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {state.phase === "loading" && (
        <p className="customers-page__loading">Loading customers…</p>
      )}

      {state.phase === "error" && (
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load customers — {state.message}
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
        <CustomerTable customers={filteredCustomers} />
      )}
    </section>
  );
}

export default CustomersPage;
