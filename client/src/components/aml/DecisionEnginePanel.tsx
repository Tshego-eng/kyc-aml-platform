import { useEffect, useState } from "react";
import {
  getCaseDecisionRecommendation,
  getCaseEscalationEvaluation,
  validateCaseDecision,
} from "../../services/aml.service";
import { ApiError } from "../../types/api";
import type {
  DecisionRecommendation,
  EscalationEvaluation,
  CaseDecision,
} from "../../types/decision";
import type { AMLCaseStatus } from "../../types/aml";
import StatusBadge from "../StatusBadge";
import { humanizeLabel, riskLevelTone } from "../../utils/format";

const DECISIONS: CaseDecision[] = [
  "CONTINUE_INVESTIGATION",
  "FALSE_POSITIVE",
  "RESOLVE",
  "ESCALATE",
  "REGULATORY_REPORT",
];

// Frontend-only sequencing choice, not a backend contract: maps a
// validated CaseDecision onto the AMLCaseStatus the officer would then
// apply via the existing status-update endpoint. REGULATORY_REPORT has
// no direct status (the backend requires the case to already be
// ESCALATED before that decision validates), so it's left unmapped.
const DECISION_TO_STATUS: Record<CaseDecision, AMLCaseStatus | null> = {
  CONTINUE_INVESTIGATION: "INVESTIGATING",
  FALSE_POSITIVE: "FALSE_POSITIVE",
  RESOLVE: "RESOLVED",
  ESCALATE: "ESCALATED",
  REGULATORY_REPORT: null,
};

type ContextState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "ready";
      recommendation: DecisionRecommendation;
      escalation: EscalationEvaluation;
    };

async function fetchContext(caseId: string): Promise<ContextState> {
  try {
    const [recommendation, escalation] = await Promise.all([
      getCaseDecisionRecommendation(caseId),
      getCaseEscalationEvaluation(caseId),
    ]);
    return { phase: "ready", recommendation, escalation };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Unable to load decision engine data.";
    return { phase: "error", message };
  }
}

interface DecisionEnginePanelProps {
  caseId: string;
  canValidate: boolean;
  onDecisionValidated: (mappedStatus: AMLCaseStatus | null) => void;
}

/**
 * Presents the backend's Case Decision Engine (Step 32): a deterministic
 * recommendation plus escalation criteria, both computed server-side
 * from real risk/alert/KYC data. The officer picks a decision, it's
 * validated against the backend's own business rules (case not already
 * finalized, REGULATORY_REPORT requires ESCALATED, etc.), and only on
 * success is a corresponding status change handed off to the case
 * status panel — this panel never changes case state itself.
 */
function DecisionEnginePanel({
  caseId,
  canValidate,
  onDecisionValidated,
}: DecisionEnginePanelProps) {
  const [state, setState] = useState<ContextState>({ phase: "loading" });
  const [decision, setDecision] = useState<CaseDecision | "">("");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchContext(caseId).then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const handleValidate = async () => {
    if (!decision) return;
    setValidationError(null);
    setValidationResult(null);
    setValidating(true);
    try {
      const result = await validateCaseDecision(caseId, decision);
      setValidationResult(
        `Valid — current status is ${humanizeLabel(result.currentStatus)}.`
      );
      onDecisionValidated(DECISION_TO_STATUS[decision]);
    } catch (error) {
      setValidationError(
        error instanceof ApiError
          ? error.message
          : "Unable to validate this decision."
      );
    } finally {
      setValidating(false);
    }
  };

  if (state.phase === "loading") {
    return (
      <div className="profile-panel">
        <h2 className="profile-panel__title">Decision engine</h2>
        <p className="profile-panel__empty">Loading recommendation…</p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="profile-panel">
        <h2 className="profile-panel__title">Decision engine</h2>
        <p className="profile-panel__error">{state.message}</p>
      </div>
    );
  }

  const { recommendation, escalation } = state;
  const mappedStatus = decision ? DECISION_TO_STATUS[decision] : null;

  return (
    <div className="profile-panel">
      <h2 className="profile-panel__title">Decision engine</h2>

      <div className="decision-block">
        <span className="decision-block__label">Recommended decision</span>
        <StatusBadge
          label={humanizeLabel(recommendation.recommendation)}
          tone={
            recommendation.recommendation === "ESCALATE"
              ? "negative"
              : recommendation.recommendation === "RESOLVE"
                ? "positive"
                : "warning"
          }
        />
      </div>

      {recommendation.reasons.length > 0 ? (
        <ul className="decision-block__reasons">
          {recommendation.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p className="profile-panel__empty">
          No specific factors were flagged for this recommendation.
        </p>
      )}

      <dl className="profile-panel__list">
        <div className="profile-panel__row">
          <dt>Customer risk</dt>
          <dd>
            {recommendation.riskLevel ? (
              <StatusBadge
                label={humanizeLabel(recommendation.riskLevel)}
                tone={riskLevelTone(recommendation.riskLevel)}
              />
            ) : (
              "Not assessed"
            )}
            {recommendation.riskScore !== null &&
              ` (score ${recommendation.riskScore})`}
          </dd>
        </div>
        <div className="profile-panel__row">
          <dt>Active alerts</dt>
          <dd>
            {recommendation.activeAlertCount} total —{" "}
            {recommendation.criticalAlertCount} critical,{" "}
            {recommendation.highAlertCount} high
          </dd>
        </div>
        <div className="profile-panel__row">
          <dt>Failed KYC checks</dt>
          <dd>{recommendation.failedKYCCheckCount}</dd>
        </div>
      </dl>

      <div className="decision-block">
        <span className="decision-block__label">Escalation criteria</span>
        <StatusBadge
          label={escalation.shouldEscalate ? "Escalation recommended" : "No escalation criteria met"}
          tone={escalation.shouldEscalate ? "negative" : "positive"}
        />
      </div>
      {escalation.reasons.length > 0 && (
        <ul className="decision-block__reasons">
          {escalation.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      )}

      {canValidate && (
        <div className="decision-form">
          <label className="check-form__field">
            <span>Compliance officer decision</span>
            <select
              value={decision}
              onChange={(event) => {
                setDecision(event.target.value as CaseDecision);
                setValidationResult(null);
                setValidationError(null);
              }}
            >
              <option value="">Select a decision</option>
              {DECISIONS.map((option) => (
                <option key={option} value={option}>
                  {humanizeLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="check-form__submit"
            onClick={handleValidate}
            disabled={validating || !decision}
          >
            {validating ? "Validating…" : "Validate decision"}
          </button>

          {validationResult && (
            <p className="profile-panel__note">
              {validationResult}{" "}
              {mappedStatus
                ? `You can now apply this via "Update status" below.`
                : "This decision requires the case to already be ESCALATED, and doesn't map to a direct status change — regulatory reporting is handled in a later step."}
            </p>
          )}
          {validationError && (
            <p className="profile-panel__error">{validationError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default DecisionEnginePanel;
