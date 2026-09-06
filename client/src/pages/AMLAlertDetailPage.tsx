import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAMLAlert, updateAMLAlertStatus } from "../services/aml.service";
import { ApiError } from "../types/api";
import type { AMLAlertDetail } from "../types/aml";
import type { AlertStatus } from "../types/dashboard";
import { useRole } from "../hooks/useRole";
import StatusBadge from "../components/StatusBadge";
import {
  formatCurrencyAmount,
  formatDateTime,
  humanizeLabel,
  alertStatusTone,
  riskLevelTone,
} from "../utils/format";
import { ALERT_STATUS_TRANSITIONS } from "../utils/amlTransitions";

type PageState =
  | { phase: "loading" }
  | { phase: "not-found" }
  | { phase: "error"; message: string }
  | { phase: "ready"; alert: AMLAlertDetail };

async function fetchAlertState(alertId: string): Promise<PageState> {
  try {
    const res = await getAMLAlert(alertId);
    return { phase: "ready", alert: res.alert };
  } catch (error) {
    if (error instanceof ApiError && error.kind === "not_found") {
      return { phase: "not-found" };
    }
    const message =
      error instanceof ApiError ? error.message : "Unable to load this alert.";
    return { phase: "error", message };
  }
}

/**
 * AML Alert detail. Uses GET /api/aml-alerts/:id directly — the only
 * endpoint the backend exposes for a single alert, already including
 * the full customer and transaction relations.
 */
function AMLAlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasAnyRole } = useRole();
  const [state, setState] = useState<PageState>(() =>
    id ? { phase: "loading" } : { phase: "not-found" }
  );
  const [nextStatus, setNextStatus] = useState<AlertStatus | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    fetchAlertState(id).then(setState);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchAlertState(id).then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER") on
  // PATCH /api/aml-alerts/:id/status.
  const canUpdateStatus = hasAnyRole(["ADMIN", "COMPLIANCE_OFFICER"]);

  const handleUpdateStatus = async () => {
    if (!id || !nextStatus) return;
    setStatusError(null);
    setSubmitting(true);
    try {
      await updateAMLAlertStatus(id, nextStatus);
      setNextStatus("");
      reload();
    } catch (error) {
      setStatusError(
        error instanceof ApiError ? error.message : "Unable to update status."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (state.phase === "loading") {
    return (
      <section className="customer-profile" aria-busy="true">
        <p className="customer-profile__loading">Loading alert…</p>
      </section>
    );
  }

  if (state.phase === "not-found") {
    return (
      <section className="customer-profile">
        <h1 className="dashboard__heading">Alert not found</h1>
        <p className="customer-profile__not-found-body">
          This AML alert doesn&apos;t exist or may have been removed.
        </p>
        <Link to="/aml-alerts" className="access-denied__link">
          Return to AML Alerts
        </Link>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="customer-profile">
        <h1 className="dashboard__heading">AML Alert</h1>
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load this alert — {state.message}
          </p>
          <button type="button" className="dashboard-error__retry" onClick={reload}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  const { alert } = state;
  const availableTransitions = ALERT_STATUS_TRANSITIONS[alert.status];

  return (
    <section className="customer-profile">
      <div className="customer-profile__header">
        <div>
          <Link to="/aml-alerts" className="customer-profile__back">
            ← AML Alerts
          </Link>
          <h1 className="customer-profile__heading">
            {humanizeLabel(alert.type)}
          </h1>
        </div>
        <div className="check-list__side">
          <StatusBadge
            label={humanizeLabel(alert.severity)}
            tone={riskLevelTone(alert.severity)}
          />
          <StatusBadge
            label={humanizeLabel(alert.status)}
            tone={alertStatusTone(alert.status)}
          />
        </div>
      </div>

      <div className="customer-profile__grid">
        <div className="profile-panel">
          <h2 className="profile-panel__title">Alert information</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Description</dt>
              <dd>{alert.description}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Created</dt>
              <dd>{formatDateTime(alert.createdAt)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Last updated</dt>
              <dd>{formatDateTime(alert.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="profile-panel">
          <h2 className="profile-panel__title">Customer</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Name</dt>
              <dd>
                <Link to={`/customers/${alert.customer.id}`}>
                  {alert.customer.firstName} {alert.customer.lastName}
                </Link>
              </dd>
            </div>
            <div className="profile-panel__row">
              <dt>KYC status</dt>
              <dd>{humanizeLabel(alert.customer.kycStatus)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>ID number</dt>
              <dd>{alert.customer.idNumber}</dd>
            </div>
          </dl>
        </div>
      </div>

      {alert.transaction && (
        <div className="profile-panel">
          <h2 className="profile-panel__title">Related transaction</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Amount</dt>
              <dd>
                {formatCurrencyAmount(
                  alert.transaction.amount,
                  alert.transaction.currency
                )}
              </dd>
            </div>
            <div className="profile-panel__row">
              <dt>Type</dt>
              <dd>{humanizeLabel(alert.transaction.type)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Status</dt>
              <dd>{humanizeLabel(alert.transaction.status)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Country</dt>
              <dd>{alert.transaction.country}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Timestamp</dt>
              <dd>{formatDateTime(alert.transaction.timestamp)}</dd>
            </div>
          </dl>
        </div>
      )}

      {canUpdateStatus && (
        <div className="profile-panel">
          <h2 className="profile-panel__title">Update status</h2>
          {availableTransitions.length === 0 ? (
            <p className="profile-panel__empty">
              This alert is in a final state and can&apos;t be changed further.
            </p>
          ) : (
            <form
              className="check-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleUpdateStatus();
              }}
            >
              <label className="check-form__field">
                <span>New status</span>
                <select
                  value={nextStatus}
                  onChange={(event) =>
                    setNextStatus(event.target.value as AlertStatus)
                  }
                >
                  <option value="">Select a status</option>
                  {availableTransitions.map((status) => (
                    <option key={status} value={status}>
                      {humanizeLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="check-form__submit"
                disabled={submitting || !nextStatus}
              >
                {submitting ? "Updating…" : "Update status"}
              </button>
              {statusError && (
                <p className="profile-panel__error">{statusError}</p>
              )}
            </form>
          )}
        </div>
      )}
    </section>
  );
}

export default AMLAlertDetailPage;
