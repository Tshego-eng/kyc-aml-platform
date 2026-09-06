import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAMLCase } from "../services/aml.service";
import { ApiError } from "../types/api";
import type { AMLCaseDetail, AMLCaseStatus } from "../types/aml";
import { useRole } from "../hooks/useRole";
import StatusBadge from "../components/StatusBadge";
import CaseAssignmentPanel from "../components/aml/CaseAssignmentPanel";
import CaseStatusPanel from "../components/aml/CaseStatusPanel";
import CaseNotesPanel from "../components/aml/CaseNotesPanel";
import CaseEvidencePanel from "../components/aml/CaseEvidencePanel";
import DecisionEnginePanel from "../components/aml/DecisionEnginePanel";
import CaseRegulatoryReportsPanel from "../components/aml/CaseRegulatoryReportsPanel";
import CaseTimeline from "../components/aml/CaseTimeline";
import {
  formatCurrencyAmount,
  formatDateTime,
  humanizeLabel,
  caseStatusTone,
  riskLevelTone,
  checkStatusTone,
  kycStatusTone,
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
 * Compliance Officer Investigation Workspace (Step 37). Brings case,
 * alert, customer, KYC, risk, transaction, notes, evidence, assignment,
 * status, the Step 32 decision engine, and a real-data timeline into one
 * screen so an investigation doesn't require navigating between pages.
 * All data is the exact same GET /api/aml-cases/:id response used by the
 * Step 36 case detail page, plus the three decision-engine endpoints and
 * (role-permitting) GET /api/audit for status-change history.
 */
function InvestigationWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { hasAnyRole } = useRole();
  const [state, setState] = useState<PageState>(() =>
    id ? { phase: "loading" } : { phase: "not-found" }
  );
  const [presetStatus, setPresetStatus] = useState<AMLCaseStatus | null>(null);

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

  // Same role set as the Step 36 case detail page's action controls.
  const canManageCase = hasAnyRole(["ADMIN", "COMPLIANCE_OFFICER"]);
  // Matches authorize("ADMIN", "COMPLIANCE_OFFICER") on
  // POST /aml-cases/:id/validate-decision specifically.
  const canValidateDecision = hasAnyRole(["ADMIN", "COMPLIANCE_OFFICER"]);
  // Matches authorize("ADMIN", "COMPLIANCE_OFFICER") on GET /api/audit.
  const canViewAudit = hasAnyRole(["ADMIN", "COMPLIANCE_OFFICER"]);

  if (state.phase === "loading") {
    return (
      <section className="customer-profile" aria-busy="true">
        <p className="customer-profile__loading">Loading investigation…</p>
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
        <h1 className="dashboard__heading">Investigation</h1>
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
  const latestRisk = amlCase.customer.riskAssessments[0] ?? null;

  return (
    <section className="customer-profile">
      <div className="customer-profile__header">
        <div>
          <Link to={`/aml-cases/${amlCase.id}`} className="customer-profile__back">
            ← Case details
          </Link>
          <h1 className="customer-profile__heading">
            Investigation — {amlCase.customer.firstName} {amlCase.customer.lastName}
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
        </div>
      </div>

      <div className="customer-profile__grid">
        <div className="profile-panel">
          <h2 className="profile-panel__title">Case overview</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Assigned officer</dt>
              <dd>
                {amlCase.assignedTo
                  ? `${amlCase.assignedTo.name} (${humanizeLabel(amlCase.assignedTo.role)})`
                  : "Unassigned"}
              </dd>
            </div>
            <div className="profile-panel__row">
              <dt>Created</dt>
              <dd>{formatDateTime(amlCase.createdAt)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Last updated</dt>
              <dd>{formatDateTime(amlCase.updatedAt)}</dd>
            </div>
            {amlCase.resolution && (
              <div className="profile-panel__row">
                <dt>Resolution</dt>
                <dd>{amlCase.resolution}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="profile-panel">
          <h2 className="profile-panel__title">Alert context</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Type</dt>
              <dd>{humanizeLabel(amlCase.alert.type)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Severity</dt>
              <dd>
                <StatusBadge
                  label={humanizeLabel(amlCase.alert.severity)}
                  tone={riskLevelTone(amlCase.alert.severity)}
                />
              </dd>
            </div>
            <div className="profile-panel__row">
              <dt>Description</dt>
              <dd>{amlCase.alert.description}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Triggered</dt>
              <dd>{formatDateTime(amlCase.alert.createdAt)}</dd>
            </div>
          </dl>
          <Link to={`/aml-alerts/${amlCase.alert.id}`} className="access-denied__link">
            View full alert →
          </Link>
        </div>
      </div>

      <div className="customer-profile__grid">
        <div className="profile-panel">
          <h2 className="profile-panel__title">Customer &amp; KYC context</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Name</dt>
              <dd>
                {amlCase.customer.firstName} {amlCase.customer.lastName}
              </dd>
            </div>
            <div className="profile-panel__row">
              <dt>Email</dt>
              <dd>{amlCase.customer.email ?? "—"}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Phone</dt>
              <dd>{amlCase.customer.phone ?? "—"}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>KYC status</dt>
              <dd>
                <StatusBadge
                  label={humanizeLabel(amlCase.customer.kycStatus)}
                  tone={kycStatusTone(amlCase.customer.kycStatus)}
                />
              </dd>
            </div>
          </dl>

          {amlCase.customer.kycChecks.length === 0 ? (
            <p className="profile-panel__empty">No KYC checks recorded.</p>
          ) : (
            <ul className="check-list">
              {amlCase.customer.kycChecks.slice(0, 5).map((check) => (
                <li key={check.id} className="check-list__item">
                  <div className="check-list__main">
                    <span className="check-list__type">
                      {humanizeLabel(check.checkType)}
                    </span>
                  </div>
                  <div className="check-list__side">
                    <StatusBadge
                      label={humanizeLabel(check.status)}
                      tone={checkStatusTone(check.status)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/customers/${amlCase.customer.id}`}
            className="access-denied__link"
          >
            View full customer profile →
          </Link>
        </div>

        <div className="profile-panel">
          <h2 className="profile-panel__title">Risk context</h2>
          {latestRisk ? (
            <ul className="risk-list">
              {amlCase.customer.riskAssessments.slice(0, 5).map((assessment) => (
                <li key={assessment.id} className="risk-list__item">
                  <div className="risk-list__header">
                    <StatusBadge
                      label={humanizeLabel(assessment.level)}
                      tone={riskLevelTone(assessment.level)}
                    />
                    <span className="risk-list__score">
                      Score {assessment.score}
                    </span>
                  </div>
                  {Array.isArray(assessment.reasons) &&
                    assessment.reasons.length > 0 && (
                      <ul className="risk-list__reasons">
                        {assessment.reasons.map((reason, index) => (
                          <li key={index}>{String(reason)}</li>
                        ))}
                      </ul>
                    )}
                  <span className="risk-list__date">
                    {formatDateTime(assessment.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="profile-panel__empty">
              No risk assessments recorded for this customer.
            </p>
          )}
        </div>
      </div>

      <div className="profile-panel">
        <h2 className="profile-panel__title">Transaction context</h2>
        {amlCase.customer.transactions.length === 0 ? (
          <p className="profile-panel__empty">No related transactions found.</p>
        ) : (
          <ul className="check-list">
            {amlCase.customer.transactions.slice(0, 15).map((transaction) => {
              const isAlertTransaction =
                amlCase.alert.transactionId === transaction.id;
              return (
                <li key={transaction.id} className="check-list__item">
                  <div className="check-list__main">
                    <span className="check-list__type">
                      {humanizeLabel(transaction.type)} —{" "}
                      {formatCurrencyAmount(
                        transaction.amount,
                        transaction.currency
                      )}
                      {isAlertTransaction && (
                        <StatusBadge label="Alert transaction" tone="warning" />
                      )}
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
              );
            })}
          </ul>
        )}
      </div>

      <DecisionEnginePanel
        caseId={amlCase.id}
        canValidate={canValidateDecision}
        onDecisionValidated={setPresetStatus}
      />

      <CaseRegulatoryReportsPanel caseId={amlCase.id} canManage={canManageCase} />

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
        presetStatus={presetStatus}
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

      <CaseTimeline amlCase={amlCase} canViewAudit={canViewAudit} />
    </section>
  );
}

export default InvestigationWorkspacePage;
