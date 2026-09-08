import { useState, type FormEvent } from "react";
import { addCaseEvidence } from "../../services/aml.service";
import { ApiError } from "../../types/api";
import type { CaseEvidence } from "../../types/aml";
import { formatDateTime } from "../../utils/format";

interface CaseEvidencePanelProps {
  caseId: string;
  canManage: boolean;
  evidence: CaseEvidence[];
  onChanged: () => void;
}

// Backend accepts metadata only ({ fileName, fileType?, description? }) —
// there is no file-upload mechanism, so this form doesn't invent one.
function CaseEvidencePanel({
  caseId,
  canManage,
  evidence,
  onChanged,
}: CaseEvidencePanelProps) {
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fileName.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await addCaseEvidence(
        caseId,
        fileName.trim(),
        fileType.trim() || undefined,
        description.trim() || undefined
      );
      setFileName("");
      setFileType("");
      setDescription("");
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to add this evidence."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-panel">
      <h2 className="profile-panel__title">Evidence</h2>
      {evidence.length === 0 ? (
        <p className="profile-panel__empty">No evidence recorded yet.</p>
      ) : (
        <ul className="check-list">
          {evidence.map((item) => (
            <li key={item.id} className="check-list__item">
              <div className="check-list__main">
                <span className="check-list__type">{item.fileName}</span>
                {item.description && (
                  <span className="check-list__notes">{item.description}</span>
                )}
              </div>
              <div className="check-list__side">
                {item.fileType && (
                  <span className="check-list__score">{item.fileType}</span>
                )}
                <span className="check-list__date">
                  {item.uploader.name} · {formatDateTime(item.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form className="check-form" onSubmit={handleAddEvidence}>
          <label className="check-form__field">
            <span>File name</span>
            <input
              type="text"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="e.g. wire-transfer-receipt.pdf"
            />
          </label>
          <label className="check-form__field">
            <span>File type (optional)</span>
            <input
              type="text"
              value={fileType}
              onChange={(event) => setFileType(event.target.value)}
              placeholder="e.g. application/pdf"
            />
          </label>
          <label className="check-form__field">
            <span>Description (optional)</span>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="check-form__submit"
            disabled={submitting || !fileName.trim()}
          >
            {submitting ? "Adding…" : "Add evidence"}
          </button>
          {error && <p className="profile-panel__error">{error}</p>}
        </form>
      )}
    </div>
  );
}

export default CaseEvidencePanel;
