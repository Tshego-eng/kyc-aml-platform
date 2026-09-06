import { useState, type FormEvent } from "react";
import { updateAMLCaseStatus } from "../../services/aml.service";
import { ApiError } from "../../types/api";
import type { AMLCaseStatus, RegulatoryDecision } from "../../types/aml";
import { humanizeLabel } from "../../utils/format";
import {
  CASE_STATUS_TRANSITIONS,
  CASE_STATUSES_REQUIRING_RESOLUTION,
  CASE_STATUSES_REQUIRING_REGULATORY_DECISION,
} from "../../utils/amlTransitions";

const REGULATORY_DECISIONS: RegulatoryDecision[] = [
  "FALSE_POSITIVE",
  "NO_FURTHER_ACTION",
  "INTERNAL_ESCALATION",
  "REGULATORY_REPORT",
];

interface CaseStatusPanelProps {
  caseId: string;
  canManage: boolean;
  currentStatus: AMLCaseStatus;
  hasContext: boolean;
  onChanged: () => void;
  /** Optional: pre-select a target status (e.g. from a validated decision). */
  presetStatus?: AMLCaseStatus | null;
}

/**
 * Shared case-status panel used by both the AML case detail page (Step
 * 36) and the investigation workspace (Step 37). Transition rules mirror
 * server/src/services/aml-case.service.ts exactly for UX purposes only —
 * the backend still enforces everything server-side.
 */
function CaseStatusPanel({
  caseId,
  canManage,
  currentStatus,
  hasContext,
  onChanged,
  presetStatus,
}: CaseStatusPanelProps) {
  const [nextStatus, setNextStatus] = useState<AMLCaseStatus | "">("");
  const [resolution, setResolution] = useState("");
  const [regulatoryDecision, setRegulatoryDecision] = useState<
    RegulatoryDecision | ""
  >("");
  const [regulatoryReason, setRegulatoryReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTransitions = CASE_STATUS_TRANSITIONS[currentStatus];

  const [lastAppliedPreset, setLastAppliedPreset] = useState<
    AMLCaseStatus | null | undefined
  >(undefined);

  // Sync nextStatus when a new presetStatus arrives (e.g. from a
  // validated decision), without using an Effect: this is React's
  // documented "adjust state during render" pattern for reacting to a
  // prop change, rather than calling setState inside useEffect.
  if (presetStatus !== lastAppliedPreset) {
    setLastAppliedPreset(presetStatus ?? null);
    if (presetStatus && availableTransitions.includes(presetStatus)) {
      setNextStatus(presetStatus);
    }
  }

  if (!canManage) {
    return null;
  }

  const needsResolution =
    nextStatus !== "" && CASE_STATUSES_REQUIRING_RESOLUTION.includes(nextStatus);
  const needsRegulatoryDecision =
    nextStatus !== "" &&
    CASE_STATUSES_REQUIRING_REGULATORY_DECISION.includes(nextStatus);

  const handleUpdateStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nextStatus) return;
    setError(null);

    if (needsResolution && !resolution.trim()) {
      setError("A resolution is required for this status.");
      return;
    }
    if (needsRegulatoryDecision && !regulatoryDecision) {
      setError("A regulatory decision is required for this status.");
      return;
    }
    if (regulatoryDecision && !regulatoryReason.trim()) {
      setError(
        "A regulatory reason is required when a regulatory decision is set."
      );
      return;
    }

    setSubmitting(true);
    try {
      await updateAMLCaseStatus(caseId, {
        status: nextStatus,
        ...(resolution.trim() ? { resolution: resolution.trim() } : {}),
        ...(regulatoryDecision ? { regulatoryDecision } : {}),
        ...(regulatoryReason.trim()
          ? { regulatoryReason: regulatoryReason.trim() }
          : {}),
      });
      setNextStatus("");
      setResolution("");
      setRegulatoryDecision("");
      setRegulatoryReason("");
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to update this case."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-panel">
      <h2 className="profile-panel__title">Update status</h2>
      {availableTransitions.length === 0 ? (
        <p className="profile-panel__empty">
          This case is in a final state and can&apos;t be changed further.
        </p>
      ) : (
        <form className="review-form" onSubmit={handleUpdateStatus}>
          <label className="review-form__field">
            <span>New status</span>
            <select
              value={nextStatus}
              onChange={(event) =>
                setNextStatus(event.target.value as AMLCaseStatus)
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

          {needsResolution && !hasContext && (
            <p className="profile-panel__error">
              This case has no notes or evidence yet — the backend requires
              at least one before it can be resolved or marked a false
              positive.
            </p>
          )}

          {needsResolution && (
            <label className="review-form__field">
              <span>Resolution</span>
              <textarea
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                rows={2}
              />
            </label>
          )}

          {needsRegulatoryDecision && (
            <label className="review-form__field">
              <span>Regulatory decision</span>
              <select
                value={regulatoryDecision}
                onChange={(event) =>
                  setRegulatoryDecision(event.target.value as RegulatoryDecision)
                }
              >
                <option value="">Select a decision</option>
                {REGULATORY_DECISIONS.map((decision) => (
                  <option key={decision} value={decision}>
                    {humanizeLabel(decision)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {regulatoryDecision && (
            <label className="review-form__field">
              <span>Regulatory reason</span>
              <textarea
                value={regulatoryReason}
                onChange={(event) => setRegulatoryReason(event.target.value)}
                rows={2}
              />
            </label>
          )}

          <button
            type="submit"
            className="review-form__submit"
            disabled={submitting || !nextStatus}
          >
            {submitting ? "Updating…" : "Update status"}
          </button>
          {error && <p className="profile-panel__error">{error}</p>}
        </form>
      )}
    </div>
  );
}

export default CaseStatusPanel;
