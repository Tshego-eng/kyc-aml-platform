import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAMLCase } from "../services/aml.service";
import { ApiError } from "../types/api";
import type { AMLCaseDetail } from "../types/aml";
import { useRole } from "../hooks/useRole";
import StatusBadge from "../components/StatusBadge";
import CaseAssignmentPanel from "../components/aml/CaseAssignmentPanel";
import CaseStatusPanel from "../components/aml/CaseStatusPanel";
import CaseNotesPanel from "../components/aml/CaseNotesPanel";
import CaseEvidencePanel from "../components/aml/CaseEvidencePanel";
import {
  formatCurrencyAmount,
  formatDateTime,
  humanizeLabel,
  caseStatusTone,
  riskLevelTone,
  checkStatusTone,
} from "../utils/format";

type PageState =
  | { phase: "loading" }
  | { phase: "not-found" }
  | { phase: "error"; message: string }
  | { phase: "ready"; case: AMLCaseDetail };

async function fetchCaseState(caseId: string): Promise<PageState> {
  try {
    const res = await getAMLCase(caseId);
    return { phase: "ready", case: res.case };
  } catch (error) {
    if (error instanceof ApiError && error.kind === "not_found") {
      return { phase: "not-found" };
    }
    const message =
      error instanceof ApiError ? error.message : "Unable to load this case.";
    return { phase: "error", message };
  }
}

/**
 * AML Case detail — Step 36 scope: case info, customer/KYC/risk/
 * transaction context, assignment, status transitions, notes, and
 * evidence (assignment/status/notes/evidence panels are shared with the
 * Step 37 investigation workspace). The decision-recommendation,
 * escalation-evaluation, and decision-validation endpoints are used only
 * in the investigation workspace, linked below for authorized roles.
 */
function AMLCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasAnyRole } = useRole();
  const [state, setState] = useState<PageState>(() =>
    id ? { phase: "loading" } : { phase: "not-found" }
  );

  const reload = useCallback(() => {
    if (!id) return;
    fetchCaseState(id).then(setState);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchCaseState(id).then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER") on assign, status,
  // notes, and evidence routes (server/src/routes/aml-case.routes.ts).
  // ANALYST can view a case but not act on it.
  const canManageCase = hasAnyRole(["ADMIN", "COMPLIANCE_OFFICER"]);
  const canOpenInvestigation = hasAnyRole([
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "ANALYST",
  ]);

  if (state.phase === "loading") {
    return (
      <section className="customer-profile" aria-busy="true">
        <p className="customer-profile__loading">Loading case…</p>
      </section>
    );
  }

  if (state.phase === "not-found") {
    return (
      <section className="customer-profile">
        <h1 className="dashboard__heading">Case not found</h1>
        <p className="customer-profile__not-found-body">
          This AML case doesn&apos;t exist or may have been removed.
        </p>
        <Link to="/aml-cases" className="access-denied__link">
          Return to AML Cases
        </Link>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="customer-profile">
        <h1 className="dashboard__heading">AML Case</h1>
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load this case — {state.message}
          </p>
          <button type="button" className="dashboard-error__retry" onClick={reload}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  const { case: amlCase } = state;
  const hasContext = amlCase.notes.length > 0 || amlCase.evidence.length > 0;

  return (
    <section className="customer-profile">
      <div className="customer-profile__header">
        <div>
          <Link to="/aml-cases" className="customer-profile__back">
            ← AML Cases
          </Link>
          <h1 className="customer-profile__heading">
            {amlCase.customer.firstName} {amlCase.customer.lastName} —{" "}
            {humanizeLabel(amlCase.alert.type)}
          </h1>
        </div>
        <div className="check-list__side">
          <StatusBadge
            label={humanizeLabel(amlCase.priority)}
            tone={riskLevelTone(amlCase.priority)}
          />
          <StatusBadge
            label={humanizeLabel(amlCase.status)}
            tone={caseStatusTone(amlCase.status)}
          />
          {canOpenInvestigation && (
            <Link
              to={`/aml-cases/${amlCase.id}/investigation`}
              className="profile-panel__action"
            >
              Open Investigation
            </Link>
          )}
        </div>
      </div>

      <div className="customer-profile__grid">
        <div className="profile-panel">
          <h2 className="profile-panel__title">Case information</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Alert</dt>
              <dd>{amlCase.alert.description}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Assigned to</dt>
              <dd>
                {amlCase.assignedTo
                  ? `${amlCase.assignedTo.name} (${humanizeLabel(amlCase.assignedTo.role)})`
                  : "Unassigned"}
              </dd>
            </div>
            {amlCase.resolution && (
              <div className="profile-panel__row">
                <dt>Resolution</dt>
                <dd>{amlCase.resolution}</dd>
              </div>
            )}
            {amlCase.regulatoryDecision && (
              <div className="profile-panel__row">
                <dt>Regulatory decision</dt>
                <dd>{humanizeLabel(amlCase.regulatoryDecision)}</dd>
              </div>
            )}
            {amlCase.regulatoryReason && (
              <div className="profile-panel__row">
                <dt>Regulatory reason</dt>
                <dd>{amlCase.regulatoryReason}</dd>
              </div>
            )}
            <div className="profile-panel__row">
              <dt>Created</dt>
              <dd>{formatDateTime(amlCase.createdAt)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Last updated</dt>
              <dd>{formatDateTime(amlCase.updatedAt)}</dd>
            </div>
            {amlCase.closedAt && (
              <div className="profile-panel__row">
                <dt>Closed</dt>
                <dd>{formatDateTime(amlCase.closedAt)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="profile-panel">
          <h2 className="profile-panel__title">Customer &amp; KYC</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Name</dt>
              <dd>
                <Link to={`/customers/${amlCase.customer.id}`}>
                  {amlCase.customer.firstName} {amlCase.customer.lastName}
                </Link>
              </dd>
            </div>
            <div className="profile-panel__row">
              <dt>KYC status</dt>
              <dd>{humanizeLabel(amlCase.customer.kycStatus)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Recent KYC checks</dt>
              <dd>
                {amlCase.customer.kycChecks.length === 0
                  ? "None recorded"
                  : amlCase.customer.kycChecks
                      .slice(0, 3)
                      .map((check) => humanizeLabel(check.status))
                      .join(", ")}
              </dd>
            </div>
          </dl>
          {amlCase.customer.riskAssessments.length > 0 && (
            <div className="profile-panel__row">
              <dt>Latest risk</dt>
              <dd>
                <StatusBadge
                  label={humanizeLabel(amlCase.customer.riskAssessments[0].level)}
                  tone={riskLevelTone(amlCase.customer.riskAssessments[0].level)}
                />
              </dd>
            </div>
          )}
        </div>
      </div>

      {amlCase.customer.transactions.length > 0 && (
        <div className="profile-panel">
          <h2 className="profile-panel__title">Customer transactions</h2>
          <ul className="check-list">
            {amlCase.customer.transactions.slice(0, 10).map((transaction) => (
              <li key={transaction.id} className="check-list__item">
                <div className="check-list__main">
                  <span className="check-list__type">
                    {humanizeLabel(transaction.type)} —{" "}
                    {formatCurrencyAmount(transaction.amount, transaction.currency)}
                  </span>
                  <span className="check-list__notes">{transaction.country}</span>
                </div>
                <div className="check-list__side">
                  <StatusBadge
                    label={humanizeLabel(transaction.status)}
                    tone={checkStatusTone(transaction.status)}
                  />
                  <span className="check-list__date">
                    {formatDateTime(transaction.timestamp)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CaseAssignmentPanel
        caseId={amlCase.id}
        canManage={canManageCase}
        onChanged={reload}
      />

      <CaseStatusPanel
        caseId={amlCase.id}
        canManage={canManageCase}
        currentStatus={amlCase.status}
        hasContext={hasContext}
        onChanged={reload}
      />

      <CaseNotesPanel
        caseId={amlCase.id}
        canManage={canManageCase}
        notes={amlCase.notes}
        onChanged={reload}
      />

      <CaseEvidencePanel
        caseId={amlCase.id}
        canManage={canManageCase}
        evidence={amlCase.evidence}
        onChanged={reload}
      />
    </section>
  );
}

export default AMLCaseDetailPage;
