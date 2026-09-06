import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getRiskIntelligence,
  getKycRiskAnalytics,
} from "../services/riskIntelligence.service";
import { ApiError } from "../types/api";
import type {
  RiskIntelligence,
  KycRiskAnalytics,
} from "../types/riskIntelligence";
import type { RiskLevel } from "../types/dashboard";
import StatusBadge from "../components/StatusBadge";
import MetricCard from "../components/dashboard/MetricCard";
import { formatDateTime, humanizeLabel, riskLevelTone } from "../utils/format";

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "ready";
      intelligence: RiskIntelligence;
      kycRisk: KycRiskAnalytics;
    };

async function fetchState(): Promise<PageState> {
  try {
    const [intelligenceRes, kycRiskRes] = await Promise.all([
      getRiskIntelligence(),
      getKycRiskAnalytics(),
    ]);
    return {
      phase: "ready",
      intelligence: intelligenceRes.intelligence,
      kycRisk: kycRiskRes.analytics,
    };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Unable to load risk intelligence.";
    return { phase: "error", message };
  }
}

const RISK_FILTERS: Array<{ value: "ALL" | RiskLevel; label: string }> = [
  { value: "ALL", label: "All levels" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

/**
 * Risk Intelligence & Analytics (Step 39). Built entirely on Step 31's
 * existing backend: GET /api/dashboard/risk-intelligence (a single
 * aggregated call covering high-risk customers, repeat AML alert
 * customers, suspicious patterns, and compliance officer workload) plus
 * GET /api/dashboard/kyc-risk for the KYC x risk crosstab. Both
 * endpoints have no server-side filtering, so the risk-level filter on
 * the high-risk customer table below is client-side only, applied to
 * the already-loaded dataset.
 */
function RiskIntelligencePage() {
  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");

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

  const filteredHighRiskCustomers = useMemo(() => {
    if (state.phase !== "ready") return [];
    if (riskFilter === "ALL") return state.intelligence.highRiskCustomers;
    return state.intelligence.highRiskCustomers.filter(
      (customer) => customer.riskLevel === riskFilter
    );
  }, [state, riskFilter]);

  if (state.phase === "loading") {
    return (
      <section className="dashboard" aria-busy="true">
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__heading">Risk Intelligence</h1>
            <p className="dashboard__subheading">
              Operational risk analytics across customers, alerts, and cases
            </p>
          </div>
        </div>
        <p className="customers-page__loading">Loading risk intelligence…</p>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="dashboard">
        <h1 className="dashboard__heading">Risk Intelligence</h1>
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load risk intelligence — {state.message}
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

  const { intelligence, kycRisk } = state;
  const officersWithActiveCases = intelligence.complianceOfficerWorkload.filter(
    (officer) => officer.activeCases > 0
  ).length;

  return (
    <section className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__heading">Risk Intelligence</h1>
          <p className="dashboard__subheading">
            Operational risk analytics across customers, alerts, and cases
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
        <MetricCard
          title="High-risk customers"
          value={intelligence.highRiskCustomers.length.toLocaleString()}
        />
        <MetricCard
          title="Repeat AML alert customers"
          value={intelligence.repeatAMLAlertCustomers.length.toLocaleString()}
        />
        <MetricCard
          title="Suspicious pattern types"
          value={intelligence.suspiciousPatterns.length.toLocaleString()}
        />
        <MetricCard
          title="Officers with active cases"
          value={officersWithActiveCases.toLocaleString()}
          description={`${intelligence.complianceOfficerWorkload.length.toLocaleString()} compliance officers total`}
        />
      </div>

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">
          KYC status × risk level distribution
        </h2>
        <div className="metric-grid">
          <MetricCard
            title="Verified, high risk"
            value={kycRisk.verifiedHighRisk.toLocaleString()}
          />
          <MetricCard
            title="Verified, critical risk"
            value={kycRisk.verifiedCriticalRisk.toLocaleString()}
          />
          <MetricCard
            title="Pending, high risk"
            value={kycRisk.pendingHighRisk.toLocaleString()}
          />
          <MetricCard
            title="Pending, critical risk"
            value={kycRisk.pendingCriticalRisk.toLocaleString()}
          />
          <MetricCard
            title="Rejected, high risk"
            value={kycRisk.rejectedHighRisk.toLocaleString()}
          />
          <MetricCard
            title="Rejected, critical risk"
            value={kycRisk.rejectedCriticalRisk.toLocaleString()}
          />
          <MetricCard
            title="No risk assessment yet"
            value={kycRisk.customersWithoutRiskAssessment.toLocaleString()}
            description={`out of ${kycRisk.totalCustomers.toLocaleString()} customers`}
          />
        </div>
      </div>

      <div className="dashboard__section">
        <div className="profile-panel__header-row">
          <h2 className="dashboard__section-heading">High-risk customers</h2>
          <select
            className="customers-page__filter"
            value={riskFilter}
            onChange={(event) =>
              setRiskFilter(event.target.value as "ALL" | RiskLevel)
            }
            aria-label="Filter by risk level"
          >
            {RISK_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {filteredHighRiskCustomers.length === 0 ? (
          <p className="customer-table__empty">No high-risk customers found.</p>
        ) : (
          <div className="customer-table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">KYC status</th>
                  <th scope="col">Risk level</th>
                  <th scope="col">Risk score</th>
                  <th scope="col">Active alerts</th>
                  <th scope="col">Critical alerts</th>
                  <th scope="col">Last assessed</th>
                </tr>
              </thead>
              <tbody>
                {filteredHighRiskCustomers.map((customer) => (
                  <tr key={customer.customerId}>
                    <td>
                      <Link
                        className="customer-table__link"
                        to={`/customers/${customer.customerId}`}
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td>{humanizeLabel(customer.kycStatus)}</td>
                    <td>
                      {customer.riskLevel && (
                        <StatusBadge
                          label={humanizeLabel(customer.riskLevel)}
                          tone={riskLevelTone(customer.riskLevel)}
                        />
                      )}
                    </td>
                    <td>{customer.riskScore ?? "—"}</td>
                    <td>{customer.activeAlertCount}</td>
                    <td>{customer.criticalAlertCount}</td>
                    <td>
                      {customer.riskAssessmentDate
                        ? formatDateTime(customer.riskAssessmentDate)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">Repeat AML alert customers</h2>
        {intelligence.repeatAMLAlertCustomers.length === 0 ? (
          <p className="customer-table__empty">No repeat AML alerts detected.</p>
        ) : (
          <div className="customer-table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Total alerts</th>
                  <th scope="col">Critical</th>
                  <th scope="col">High</th>
                  <th scope="col">Unresolved</th>
                  <th scope="col">Alert types</th>
                  <th scope="col">Latest alert</th>
                </tr>
              </thead>
              <tbody>
                {intelligence.repeatAMLAlertCustomers.map((customer) => (
                  <tr key={customer.customerId}>
                    <td>
                      <Link
                        className="customer-table__link"
                        to={`/customers/${customer.customerId}`}
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td>{customer.totalAlerts}</td>
                    <td>{customer.criticalAlerts}</td>
                    <td>{customer.highAlerts}</td>
                    <td>{customer.unresolvedAlerts}</td>
                    <td>
                      {customer.alertTypes.map((type) => humanizeLabel(type)).join(", ")}
                    </td>
                    <td>
                      {customer.latestAlertAt
                        ? formatDateTime(customer.latestAlertAt)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">Suspicious patterns</h2>
        {intelligence.suspiciousPatterns.length === 0 ? (
          <p className="customer-table__empty">No suspicious patterns available.</p>
        ) : (
          <div className="customer-table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th scope="col">Pattern type</th>
                  <th scope="col">Alerts</th>
                  <th scope="col">Affected customers</th>
                  <th scope="col">Critical</th>
                  <th scope="col">Unresolved</th>
                </tr>
              </thead>
              <tbody>
                {intelligence.suspiciousPatterns.map((pattern) => (
                  <tr key={pattern.type}>
                    <td>{humanizeLabel(pattern.type)}</td>
                    <td>{pattern.alertCount}</td>
                    <td>{pattern.affectedCustomers}</td>
                    <td>{pattern.criticalCount}</td>
                    <td>{pattern.unresolvedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">
          Compliance officer workload
        </h2>
        {intelligence.complianceOfficerWorkload.length === 0 ? (
          <p className="customer-table__empty">No workload data available.</p>
        ) : (
          <div className="customer-table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th scope="col">Officer</th>
                  <th scope="col">Total cases</th>
                  <th scope="col">Active</th>
                  <th scope="col">Escalated</th>
                  <th scope="col">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {intelligence.complianceOfficerWorkload.map((officer) => (
                  <tr key={officer.officerId}>
                    <td>{officer.officerName}</td>
                    <td>{officer.totalCases}</td>
                    <td>{officer.activeCases}</td>
                    <td>{officer.escalatedCases}</td>
                    <td>{officer.resolvedCases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">Transaction risk</h2>
        <p className="customer-table__empty">
          Transaction risk indicators (suspicious and high-risk transaction
          counts, value by currency) are already shown on the{" "}
          <Link to="/dashboard">Compliance Dashboard</Link> — no separate
          transaction risk endpoint exists beyond what's already displayed
          there.
        </p>
      </div>
    </section>
  );
}

export default RiskIntelligencePage;
