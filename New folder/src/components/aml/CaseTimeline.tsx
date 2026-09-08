import { useEffect, useState } from "react";
import { getAuditLogs } from "../../services/audit.service";
import { ApiError } from "../../types/api";
import type { AMLCaseDetail } from "../../types/aml";
import { formatDateTime, humanizeLabel } from "../../utils/format";

interface TimelineEvent {
  id: string;
  timestamp: string;
  label: string;
  detail?: string;
}

function buildBaseTimeline(amlCase: AMLCaseDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `created-${amlCase.id}`,
      timestamp: amlCase.createdAt,
      label: "Case created",
      detail: amlCase.alert.description,
    },
  ];

  amlCase.notes.forEach((note) => {
    events.push({
      id: `note-${note.id}`,
      timestamp: note.createdAt,
      label: `Note added by ${note.author.name}`,
      detail: note.note,
    });
  });

  amlCase.evidence.forEach((item) => {
    events.push({
      id: `evidence-${item.id}`,
      timestamp: item.createdAt,
      label: `Evidence added by ${item.uploader.name}`,
      detail: item.fileName,
    });
  });

  if (amlCase.closedAt) {
    events.push({
      id: `closed-${amlCase.id}`,
      timestamp: amlCase.closedAt,
      label: "Case closed",
    });
  }

  return events;
}

interface AuditState {
  phase: "skipped" | "loading" | "error" | "ready";
  message?: string;
  events: TimelineEvent[];
}

interface CaseTimelineProps {
  amlCase: AMLCaseDetail;
  /** ADMIN/COMPLIANCE_OFFICER only — matches GET /api/audit's own RBAC. */
  canViewAudit: boolean;
}

/**
 * Builds a chronological timeline from real data only. The case detail
 * response already gives creation/notes/evidence/closedAt for every
 * viewer. Status-change history additionally comes from GET /api/audit
 * (only CASE_STATUS_CHANGED is actually logged for AML cases on the
 * backend, and that endpoint is capped at the latest 100 system-wide
 * events and restricted to ADMIN/COMPLIANCE_OFFICER) — both limitations
 * are surfaced in the UI rather than hidden.
 */
function CaseTimeline({ amlCase, canViewAudit }: CaseTimelineProps) {
  const [audit, setAudit] = useState<AuditState>({
    phase: canViewAudit ? "loading" : "skipped",
    events: [],
  });

  useEffect(() => {
    if (!canViewAudit) {
      return;
    }
    let cancelled = false;
    getAuditLogs()
      .then((res) => {
        if (cancelled) return;
        const events: TimelineEvent[] = res.logs
          .filter(
            (log) =>
              log.entity === "AMLCase" &&
              log.entityId === amlCase.id &&
              log.action === "CASE_STATUS_CHANGED"
          )
          .map((log) => {
            const details = log.details as
              | { previousStatus?: string; newStatus?: string }
              | null
              | undefined;
            const from = details?.previousStatus
              ? humanizeLabel(details.previousStatus)
              : "unknown";
            const to = details?.newStatus
              ? humanizeLabel(details.newStatus)
              : "unknown";
            return {
              id: `audit-${log.id}`,
              timestamp: log.createdAt,
              label: `Status changed by ${log.user?.name ?? "Unknown user"}`,
              detail: `${from} → ${to}`,
            };
          });
        setAudit({ phase: "ready", events });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAudit({
          phase: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Unable to load audit history.",
          events: [],
        });
      });
    return () => {
      cancelled = true;
    };
  }, [canViewAudit, amlCase.id]);

  const timeline = [...buildBaseTimeline(amlCase), ...audit.events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="profile-panel">
      <h2 className="profile-panel__title">Investigation timeline</h2>
      <p className="profile-panel__empty">
        {canViewAudit
          ? "Includes case creation, notes, evidence, and status changes (status-change history is limited to the latest 100 system-wide audit events)."
          : "Includes case creation, notes, and evidence. Status-change history is only visible to Admins and Compliance Officers."}
      </p>
      {audit.phase === "error" && (
        <p className="profile-panel__error">{audit.message}</p>
      )}
      <ul className="review-list">
        {timeline.map((event) => (
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
    </div>
  );
}

export default CaseTimeline;
