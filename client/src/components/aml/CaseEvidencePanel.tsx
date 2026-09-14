import { useRef, useState, type FormEvent } from "react";
import {
  addCaseEvidence,
  deleteCaseEvidence,
  getCaseEvidenceFile,
} from "../../services/aml.service";
import { ApiError } from "../../types/api";
import type { CaseEvidence, EvidenceCategory } from "../../types/aml";
import {
  formatDateTime,
  formatFileSize,
  humanizeLabel,
} from "../../utils/format";

interface CaseEvidencePanelProps {
  caseId: string;
  canManage: boolean;
  evidence: CaseEvidence[];
  onChanged: () => void;
}

const CATEGORY_OPTIONS: EvidenceCategory[] = [
  "IDENTITY_DOCUMENT",
  "TRANSACTION_RECORD",
  "BANK_STATEMENT",
  "CUSTOMER_COMMUNICATION",
  "SUPPORTING_DOCUMENT",
  "OTHER",
];

// Mirrors server/src/middleware/evidenceUpload.middleware.ts exactly —
// UX guidance only; the backend is the real enforcement point.
const ACCEPTED_FILE_EXTENSIONS =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openBlobInNewTab(blob: Blob, fileName: string) {
  // Avoid opening a blank preview tab for uploaded evidence. Blob previews are
  // inconsistent across browsers for some file types, and a blank page is worse
  // than a safe download fallback. The user can still open the file from the
  // download prompt when they need to inspect it.
  downloadBlob(blob, fileName);
}

/**
 * Real evidence file upload/view/download/delete (Step 41.8). Backend
 * contract: POST multipart to /aml-cases/:id/evidence (real file, 10MB
 * limit, allowlisted types — server/src/middleware/evidenceUpload.middleware.ts),
 * GET .../evidence/:evidenceId/file (authenticated binary download), and
 * DELETE .../evidence/:evidenceId — all new this step.
 */
function CaseEvidencePanel({
  caseId,
  canManage,
  evidence,
  onChanged,
}: CaseEvidencePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<EvidenceCategory>("OTHER");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setUploadError(null);
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setUploadError(
        `File exceeds the maximum allowed size of ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadError("Choose a file to upload.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      await addCaseEvidence(
        caseId,
        selectedFile,
        category,
        description.trim() || undefined
      );
      setSelectedFile(null);
      setCategory("OTHER");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onChanged();
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Unable to upload this file."
      );
    } finally {
      setUploading(false);
    }
  };

  const clearItemError = (id: string) =>
    setItemErrors((prev) => ({ ...prev, [id]: "" }));

  const handleView = async (item: CaseEvidence) => {
    clearItemError(item.id);
    setBusyId(item.id);
    try {
      const blob = await getCaseEvidenceFile(caseId, item.id);
      openBlobInNewTab(blob, item.fileName);
    } catch (err) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]:
          err instanceof ApiError ? err.message : "Unable to open this file.",
      }));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (item: CaseEvidence) => {
    clearItemError(item.id);
    setBusyId(item.id);
    try {
      const blob = await getCaseEvidenceFile(caseId, item.id);
      downloadBlob(blob, item.fileName);
    } catch (err) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]:
          err instanceof ApiError
            ? err.message
            : "Unable to download this file.",
      }));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: CaseEvidence) => {
    const confirmed = window.confirm(
      `Delete "${item.fileName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    clearItemError(item.id);
    setBusyId(item.id);
    try {
      await deleteCaseEvidence(caseId, item.id);
      onChanged();
    } catch (err) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]:
          err instanceof ApiError
            ? err.message
            : "Unable to delete this evidence.",
      }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="profile-panel">
      <h2 className="profile-panel__title">Evidence</h2>
      {evidence.length === 0 ? (
        <p className="profile-panel__empty">No evidence recorded yet.</p>
      ) : (
        <ul className="evidence-list">
          {evidence.map((item) => (
            <li key={item.id} className="evidence-card">
              <div className="evidence-card__icon" aria-hidden="true">
                <i className="bi bi-file-earmark-text" />
              </div>
              <div className="evidence-card__main">
                <span className="evidence-card__filename">
                  {item.fileName}
                </span>
                <span className="evidence-card__category">
                  {humanizeLabel(item.category)}
                </span>
                <span className="evidence-card__meta">
                  Uploaded by {item.uploader.name} ·{" "}
                  {formatDateTime(item.createdAt)}
                  {item.fileSize !== null &&
                    ` · ${formatFileSize(item.fileSize)}`}
                </span>
                {item.description && (
                  <span className="evidence-card__description">
                    {item.description}
                  </span>
                )}
                {itemErrors[item.id] && (
                  <span className="profile-panel__error">
                    {itemErrors[item.id]}
                  </span>
                )}
              </div>
              <div className="evidence-card__actions">
                {item.storageKey ? (
                  <>
                    <button
                      type="button"
                      className="profile-panel__action"
                      onClick={() => handleView(item)}
                      disabled={busyId === item.id}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="profile-panel__action"
                      onClick={() => handleDownload(item)}
                      disabled={busyId === item.id}
                    >
                      Download
                    </button>
                  </>
                ) : (
                  <span className="evidence-card__no-file">
                    No file attached
                  </span>
                )}
                {canManage && (
                  <button
                    type="button"
                    className="profile-panel__action profile-panel__action--danger"
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                  >
                    {busyId === item.id ? "…" : "Delete"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form className="check-form" onSubmit={handleUpload}>
          <label className="check-form__field">
            <span>File (PDF, image, DOC, XLS, CSV, TXT — max 10MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_EXTENSIONS}
              onChange={handleFileChange}
            />
          </label>
          <label className="check-form__field">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as EvidenceCategory)
              }
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {humanizeLabel(option)}
                </option>
              ))}
            </select>
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
            disabled={uploading || !selectedFile}
          >
            {uploading ? "Uploading…" : "Upload Evidence"}
          </button>
          {uploadError && (
            <p className="profile-panel__error">{uploadError}</p>
          )}
        </form>
      )}
    </div>
  );
}

export default CaseEvidencePanel;
