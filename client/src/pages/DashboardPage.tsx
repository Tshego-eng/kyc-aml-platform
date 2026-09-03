import { useCallback, useEffect, useState } from "react";
import {
  getDashboardSummary,
  getDashboardAmlTrends,
} from "../services/dashboard.service";
import { ApiError } from "../types/api";
import type { AmlAlertTrendPoint, DashboardSummary } from "../types/dashboard";
import { formatCurrencyAmount, formatDateTime, humanizeLabel } from "../utils/format";
import MetricCard from "../components/dashboard/MetricCard";
import StatusBreakdown from "../components/dashboard/StatusBreakdown";
import AlertTrendChart from "../components/dashboard/AlertTrendChart";
import ActivityItem from "../components/dashboard/ActivityItem";

type DashboardState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; summary: DashboardSummary; trends: AmlAlertTrendPoint[] };

function toEntries(record: Record<string, number>) {
  return Object.entries(record).map(([label, value]) => ({
    label: humanizeLabel(label),
    value,
  }));
}

function DashboardSkeleton() {
  return (
    <section className="dashboard" aria-busy="true">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__heading">Compliance Dashboard</h1>
          <p className="dashboard__subheading">
            Overview of current compliance activity
          </p>
        </div>
      </div>
      <div className="metric-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="metric-card metric-card--skeleton">
            <span className="skeleton-block skeleton-block--label" />
            <span className="skeleton-block skeleton-block--value" />
          </div>
        ))}
      </div>
      <p className="dashboard__loading-note">Loading compliance data…</p>
    </section>
  );
}

async function fetchDashboardState(): Promise<DashboardState> {
  try {
    const [summaryRes, trendsRes] = await Promise.all([
      getDashboardSummary(),
      getDashboardAmlTrends(30),
    ]);
    return {
      phase: "ready",
      summary: summaryRes.summary,
      trends: trendsRes.trends,
    };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Unable to load the compliance dashboard.";
    return { phase: "error", message };
  }
}

/**
 * Real Compliance Dashboard. Fetches GET /api/dashboard/summary (the
 * aggregated endpoint) plus GET /api/dashboard/aml/trends — the only
 * genuine time-series data the backend exposes — and renders exactly
 * what those return. No mock, hard-coded, or fabricated values.
 */
function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ phase: "loading" });

  // Initial load: state already starts as "loading" (see useState above).
  // setState is only ever called inside the .then() callback, not
  // synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;

    fetchDashboardState().then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Manual refresh: resetting to "loading" here runs in an event handler,
  // not an effect body, so it's safe to call synchronously.
  const handleRefresh = useCallback(() => {
    setState({ phase: "loading" });
    fetchDashboardState().then(setState);
  }, []);

  if (state.phase === "loading") {
    return <DashboardSkeleton />;
  }

  if (state.phase === "error") {
    return (
      <section className="dashboard">
        <h1 className="dashboard__heading">Compliance Dashboard</h1>
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Dashboard unavailable — {state.message}
          </p>
          <button
            type="button"
            className="dashboard-error__retry"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const { summary, trends } = state;

  const kpis = [
    {
      title: "Total customers",
      value: summary.compliance.totalCustomers.toLocaleString(),
      description: `${summary.compliance.pendingKYCCustomers.toLocaleString()} pending KYC`,
    },
    {
      title: "Verified customers",
      value: summary.compliance.verifiedCustomers.toLocaleString(),
      description: `${summary.compliance.rejectedCustomers.toLocaleString()} rejected`,
    },
    {
      title: "Open AML alerts",
      value: summary.compliance.openAMLAlerts.toLocaleString(),
      description: `${summary.compliance.totalAMLAlerts.toLocaleString()} total alerts`,
    },
    {
      title: "Open AML cases",
      value: summary.compliance.openCases.toLocaleString(),
      description: `${summary.compliance.totalAMLCases.toLocaleString()} total cases`,
    },
    {
      title: "High-risk customers",
      value: summary.risk.highRiskCustomers.toLocaleString(),
      description: `${summary.risk.criticalRiskCustomers.toLocaleString()} critical risk`,
    },
    {
      title: "Total transactions",
      value: summary.transactions.totalTransactions.toLocaleString(),
      description: `${summary.transactions.suspiciousTransactionCount.toLocaleString()} flagged suspicious`,
    },
  ];

  const auditLogsAvailable = summary.activity.auditLogsAvailable;

  return (
    <section className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__heading">Compliance Dashboard</h1>
          <p className="dashboard__subheading">
            Overview of current compliance activity
          </p>
        </div>
        <div className="dashboard__header-actions">
          <span className="dashboard__generated-at">
            Updated {formatDateTime(summary.generatedAt)}
          </span>
          <button
            type="button"
            className="dashboard__refresh"
            onClick={handleRefresh}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="metric-grid">
        {kpis.map((kpi) => (
          <MetricCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
          />
        ))}
      </div>

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">Operational overview</h2>
        <div className="breakdown-grid">
          <StatusBreakdown
            title="KYC status"
            entries={toEntries(summary.kyc.customersByStatus)}
          />
          <StatusBreakdown
            title="AML alert status"
            entries={toEntries(summary.aml.byStatus)}
          />
          <StatusBreakdown
            title="AML alert severity"
            entries={toEntries(summary.aml.bySeverity)}
          />
          <StatusBreakdown
            title="AML case status"
            entries={toEntries(summary.cases.byStatus)}
          />
          <StatusBreakdown
            title="Customer risk level"
            entries={toEntries(summary.risk.byLevel)}
          />
          <StatusBreakdown
            title="Transaction status"
            entries={toEntries(summary.transactions.byStatus)}
          />
        </div>

        {summary.transactions.totalTransactionValueByCurrency.length > 0 && (
          <div className="currency-summary">
            <h3 className="currency-summary__title">
              Transaction value by currency
            </h3>
            <ul className="currency-summary__list">
              {summary.transactions.totalTransactionValueByCurrency.map(
                (group) => (
                  <li key={group.currency} className="currency-summary__row">
                    <span>{group.currency}</span>
                    <span>
                      {formatCurrencyAmount(group.totalValue, group.currency)}
                    </span>
                    <span className="currency-summary__count">
                      {group.transactionCount.toLocaleString()} transactions
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">
          AML alert activity (last 30 days)
        </h2>
        <AlertTrendChart points={trends} />
      </div>

      <div className="dashboard__section">
        <h2 className="dashboard__section-heading">
          Recent compliance activity
        </h2>
        <div className="activity-grid">
          <div className="activity-panel">
            <h3 className="activity-panel__title">AML alerts</h3>
            {summary.activity.recentAMLAlerts.length === 0 ? (
              <p className="activity-panel__empty">No recent AML alerts.</p>
            ) : (
              <ul className="activity-panel__list">
                {summary.activity.recentAMLAlerts.map((alert) => (
                  <ActivityItem
                    key={alert.id}
                    title={`${alert.customer.firstName} ${alert.customer.lastName} — ${humanizeLabel(alert.type)}`}
                    meta={`${humanizeLabel(alert.status)} · ${alert.description}`}
                    badge={humanizeLabel(alert.severity)}
                    timestamp={alert.createdAt}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="activity-panel">
            <h3 className="activity-panel__title">KYC checks</h3>
            {summary.activity.recentKYCChecks.length === 0 ? (
              <p className="activity-panel__empty">No recent KYC checks.</p>
            ) : (
              <ul className="activity-panel__list">
                {summary.activity.recentKYCChecks.map((check) => (
                  <ActivityItem
                    key={check.id}
                    title={`${check.customer.firstName} ${check.customer.lastName} — ${humanizeLabel(check.checkType)}`}
                    meta={
                      check.score !== null
                        ? `Score ${check.score}`
                        : "No score recorded"
                    }
                    badge={humanizeLabel(check.status)}
                    timestamp={check.createdAt}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="activity-panel">
            <h3 className="activity-panel__title">Compliance cases</h3>
            {summary.activity.recentComplianceCases.length === 0 ? (
              <p className="activity-panel__empty">No recent cases.</p>
            ) : (
              <ul className="activity-panel__list">
                {summary.activity.recentComplianceCases.map((item) => (
                  <ActivityItem
                    key={item.id}
                    title={`${item.customer.firstName} ${item.customer.lastName} — Case ${humanizeLabel(item.status)}`}
                    meta={
                      item.assignedTo
                        ? `Assigned to ${item.assignedTo.name}`
                        : "Unassigned"
                    }
                    badge={humanizeLabel(item.priority)}
                    timestamp={item.updatedAt}
                  />
                ))}
              </ul>
            )}
          </div>

          {auditLogsAvailable && (
            <div className="activity-panel">
              <h3 className="activity-panel__title">Audit log</h3>
              {summary.activity.recentAuditLogs.length === 0 ? (
                <p className="activity-panel__empty">No recent audit entries.</p>
              ) : (
                <ul className="activity-panel__list">
                  {summary.activity.recentAuditLogs.map((log) => (
                    <ActivityItem
                      key={log.id}
                      title={`${log.user.name} — ${humanizeLabel(log.action)}`}
                      meta={`${log.entity}${log.entityId ? ` #${log.entityId}` : ""}`}
                      timestamp={log.createdAt}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
