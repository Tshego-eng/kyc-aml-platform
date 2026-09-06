import { useState, type FormEvent } from "react";
import { addInvestigationNote } from "../../services/aml.service";
import { ApiError } from "../../types/api";
import type { InvestigationNote } from "../../types/aml";
import { formatDateTime } from "../../utils/format";

interface CaseNotesPanelProps {
  caseId: string;
  canManage: boolean;
  notes: InvestigationNote[];
  onChanged: () => void;
}

function CaseNotesPanel({
  caseId,
  canManage,
  notes,
  onChanged,
}: CaseNotesPanelProps) {
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteText.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await addInvestigationNote(caseId, noteText.trim());
      setNoteText("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to add this note.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-panel">
      <h2 className="profile-panel__title">Investigation notes</h2>
      {notes.length === 0 ? (
        <p className="profile-panel__empty">No notes recorded yet.</p>
      ) : (
        <ul className="review-list">
          {notes.map((note) => (
            <li key={note.id} className="review-list__item">
              <div className="review-list__header">
                <span className="review-list__reviewer">{note.author.name}</span>
              </div>
              <p className="review-list__reason">{note.note}</p>
              <span className="review-list__date">
                {formatDateTime(note.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form className="review-form" onSubmit={handleAddNote}>
          <label className="review-form__field">
            <span>Add a note</span>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              rows={3}
            />
          </label>
          <button
            type="submit"
            className="review-form__submit"
            disabled={submitting || !noteText.trim()}
          >
            {submitting ? "Adding…" : "Add note"}
          </button>
          {error && <p className="profile-panel__error">{error}</p>}
        </form>
      )}
    </div>
  );
}

export default CaseNotesPanel;
