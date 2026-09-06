import { useEffect, useState, type FormEvent } from "react";
import {
  createRegulatoryReport,
  submitRegulatoryReport,
  acknowledgeRegulatoryReport,
} from "../../services/regulatoryReport.service";
import { getAuditLogs } from "../../services/audit.service";
import { ApiError } from "../../types/api";
import type { RegulatoryReport } from "../../types/regulatoryReport";
import StatusBadge from "../StatusBadge";
import {
  formatDateTime,
  humanizeLabel,
  regulatoryReportStatusTone,
} from "../../utils/format";

interface CaseRegulatoryReportsPanelProps {
  caseId: string;
  /** ADMIN/COMPLIANCE_OFFICER only — matches every regulatory-report route's authorize() call. */
  canManage: boolean;
}

interface ActivityEvent {
  id: string;
  timestamp: string;
  label: string;
  detail?: string;
}

type ActivityState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; events: ActivityEvent[] };

function describeActivity(action: string, details: unknown): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  const record = details as Record<string, unknown>;
  if (action === "REGULATORY_REPORT_CREATED" && typeof record.reportType === "string") {
    return `Type: ${humanizeLabel(record.reportType)}`;
  }
  if (
    (action === "REGULATORY_REPORT_SUBMITTED" ||
      action === "REGULATORY_REPORT_ACKNOWLEDGED") &&
    typeof record.referenceNumber === "string"
  ) {
    return `Reference: ${record.referenceNumber}`;
  }
  return undefined;
}

async function fetchActivity(caseId: string): Promise<ActivityState> {
  try {
    const res = await getAuditLogs();
    const events: ActivityEvent[] = res.logs
      .filter((log) => {
        if (log.entity !== "RegulatoryReport") return false;
        const details = log.details as { caseId?: string } | null | undefined;
        return details?.caseId === caseId;
      })
      .map((log) => ({
        id: log.id,
        timestamp: log.createdAt,
        label: `${humanizeLabel(log.action)} — ${log.user.name}`,
        detail: describeActivity(log.action, log.details),
      }));
    return { phase: "ready", events };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Unable to load regulatory reporting activity.";
    return { phase: "error", message };
  }
}

/**
 * Regulatory reporting for a single AML case (Step 38). The backend has
 * no GET endpoint for regulatory reports — no list route and no
 * get-by-id route (server/src/routes/regulatory-report.routes.ts only
 * has POST create, PATCH submit, PATCH acknowledge). So this panel only
 * tracks reports created during the current session (from the
 * create/submit/acknowledge responses themselves) rather than a real
 * persisted list — that limitation is stated in the UI, not hidden.
 * The "Reporting activity" section below is genuinely historical,
 * sourced from GET /api/audit filtered to this case's regulatory events.
 */
function CaseRegulatoryReportsPanel({
  caseId,
  canManage,
}: CaseRegulatoryReportsPanelProps) {
  const [reports, setReports] = useState<RegulatoryReport[]>([]);
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [referenceInputs, setReferenceInputs] = useState<Record<string, string>>(
    {}
  );
  const [actionSubmitting, setActionSubmitting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  const [activity, setActivity] = useState<ActivityState>(
    canManage ? { phase: "loading" } : { phase: "ready", events: [] }
  );

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    fetchActivity(caseId).then((result) => {
      if (!cancelled) {
        setActivity(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [caseId, canManage]);

  if (!canManage) {
    return null;
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason.trim()) return;
    setCreateError(null);
    setCreating(true);
    try {
      const res = await createRegulatoryReport(caseId, reason.trim());
      setReports((prev) => [res.report, ...prev]);
      setReason("");
    } catch (error) {
      setCreateError(
        error instanceof ApiError ? error.message : "Unable to create this report."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitReport = async (reportId: string) => {
    setActionError((prev) => ({ ...prev, [reportId]: "" }));
    setActionSubmitting(reportId);
    try {
      const referenceNumber = referenceInputs[reportId]?.trim() || undefined;
      const res = await submitRegulatoryReport(reportId, referenceNumber);
      setReports((prev) =>
        prev.map((report) => (report.id === reportId ? res.report : report))
      );
    } catch (error) {
      setActionError((prev) => ({
        ...prev,
        [reportId]:
          error instanceof ApiError ? error.message : "Unable to submit this report.",
      }));
    } finally {
      setActionSubmitting(null);
    }
  };

  const handleAcknowledgeReport = async (reportId: string) => {
    setActionError((prev) => ({ ...prev, [reportId]: "" }));
    setActionSubmitting(reportId);
    try {
      const res = await acknowledgeRegulatoryReport(reportId);
      setReports((prev) =>
        prev.map((report) => (report.id === reportId ? res.report : report))
      );
    } catch (error) {
      setActionError((prev) => ({
        ...prev,
        [reportId]:
          error instanceof ApiError
            ? error.message
            : "Unable to acknowledge this report.",
      }));
    } finally {
      setActionSubmitting(null);
    }
  };

  return (
    <div className="profile-panel">
      <h2 className="profile-panel__title">Regulatory reporting</h2>
      <p className="profile-panel__empty">
        The backend has no endpoint to list or re-fetch regulatory reports,
        so only reports created in this session are shown below. Reporting
        activity further down is a genuine historical record from the
        audit log.
      </p>

      {reports.length === 0 ? (
        <p className="profile-panel__empty">
          No regulatory reports have been created in this session yet.
        </p>
      ) : (
        <ul className="review-list">
          {reports.map((report) => (
            <li key={report.id} className="review-list__item">
              <div className="review-list__header">
                <StatusBadge
                  label={humanizeLabel(report.status)}
                  tone={regulatoryReportStatusTone(report.status)}
                />
                <span className="review-list__reviewer">
                  {humanizeLabel(report.reportType)} · {report.submittedBy.name}
                </span>
              </div>
              <p className="review-list__reason">{report.reason}</p>
              {report.referenceNumber && (
                <p className="review-list__reason">
                  Reference: {report.referenceNumber}
                </p>
              )}
              <span className="review-list__date">
                Created {formatDateTime(report.createdAt)}
                {report.submittedAt &&
                  ` · Submitted ${formatDateTime(report.submittedAt)}`}
                {report.acknowledgedAt &&
                  ` · Acknowledged ${formatDateTime(report.acknowledgedAt)}`}
              </span>

              {report.status === "DRAFT" && (
                <div className="check-form regulatory-report__actions">
                  <label className="check-form__field">
                    <span>Reference number (optional)</span>
                    <input
                      type="text"
                      value={referenceInputs[report.id] ?? ""}
                      onChange={(event) =>
                        setReferenceInputs((prev) => ({
                          ...prev,
                          [report.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="check-form__submit"
                    onClick={() => handleSubmitReport(report.id)}
                    disabled={actionSubmitting === report.id}
                  >
                    {actionSubmitting === report.id ? "Submitting…" : "Submit report"}
                  </button>
                </div>
              )}

              {report.status === "SUBMITTED" && (
                <div className="check-form regulatory-report__actions">
                  <button
                    type="button"
                    className="check-form__submit"
                    onClick={() => handleAcknowledgeReport(report.id)}
                    disabled={actionSubmitting === report.id}
                  >
                    {actionSubmitting === report.id
                      ? "Acknowledging…"
                      : "Acknowledge report"}
                  </button>
                </div>
              )}

              {actionError[report.id] && (
                <p className="profile-panel__error">{actionError[report.id]}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="review-form" onSubmit={handleCreate}>
        <label className="review-form__field">
          <span>Create a regulatory report — reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
          />
        </label>
        <button
          type="submit"
          className="review-form__submit"
          disabled={creating || !reason.trim()}
        >
          {creating ? "Creating…" : "Create report"}
        </button>
        {createError && <p className="profile-panel__error">{createError}</p>}
      </form>

      <h3 className="profile-panel__subtitle">
        Reporting activity
      </h3>
      {activity.phase === "loading" && (
        <p className="profile-panel__empty">Loading activity…</p>
      )}
      {activity.phase === "error" && (
        <p className="profile-panel__error">{activity.message}</p>
      )}
      {activity.phase === "ready" && activity.events.length === 0 && (
        <p className="profile-panel__empty">
          No regulatory reporting activity recorded for this case yet.
        </p>
      )}
      {activity.phase === "ready" && activity.events.length > 0 && (
        <ul className="review-list">
          {activity.events.map((event) => (
            <li key={event.id} className="review-list__item">
              <div className="review-list__header">
                <span className="review-list__reviewer">{event.label}</span>
              </div>
              {event.detail && (
                <p className="review-list__reason">{event.detail}</p>
              )}
              <span className="review-list__date">
                {formatDateTime(event.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CaseRegulatoryReportsPanel;
