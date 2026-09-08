import { useState, type FormEvent } from "react";
import { assignAMLCase } from "../../services/aml.service";
import { ApiError } from "../../types/api";

interface CaseAssignmentPanelProps {
  caseId: string;
  canManage: boolean;
  onChanged: () => void;
}

/**
 * Shared assignment panel used by both the AML case detail page (Step
 * 36) and the investigation workspace (Step 37), so assignment logic
 * lives in exactly one place. Reviewer is a plain user-ID field because
 * the backend has no officer-lookup endpoint.
 */
function CaseAssignmentPanel({
  caseId,
  canManage,
  onChanged,
}: CaseAssignmentPanelProps) {
  const [reviewerId, setReviewerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return null;
  }

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewerId.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await assignAMLCase(caseId, reviewerId.trim());
      setReviewerId("");
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to assign this case."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-panel">
      <h2 className="profile-panel__title">Assign case</h2>
      <p className="profile-panel__empty">
        The backend has no officer-lookup endpoint, so enter the exact user
        ID of an Admin or Compliance Officer.
      </p>
      <form className="check-form" onSubmit={handleAssign}>
        <label className="check-form__field">
          <span>Reviewer user ID</span>
          <input
            type="text"
            value={reviewerId}
            onChange={(event) => setReviewerId(event.target.value)}
            placeholder="e.g. clx1a2b3c..."
          />
        </label>
        <button
          type="submit"
          className="check-form__submit"
          disabled={submitting || !reviewerId.trim()}
        >
          {submitting ? "Assigning…" : "Assign"}
        </button>
        {error && <p className="profile-panel__error">{error}</p>}
      </form>
    </div>
  );
}

export default CaseAssignmentPanel;
