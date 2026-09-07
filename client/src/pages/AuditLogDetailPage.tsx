import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAuditLogs } from "../services/audit.service";
import { ApiError } from "../types/api";
import type { RecentAuditLog } from "../types/dashboard";
import { formatDateTime, humanizeLabel } from "../utils/format";

type PageState =
  | { phase: "loading" }
  | { phase: "not-found" }
  | { phase: "error"; message: string }
  | { phase: "ready"; log: RecentAuditLog };

// Defense-in-depth: redact any metadata key that looks like a secret,
// even though none of the real `details` payloads produced by this
// backend (checked across every controller) actually contain one.
const SENSITIVE_KEY_PATTERN = /password|token|secret|jwt|api[_-]?key/i;

function sanitizeDetails(details: unknown): unknown {
  if (!details || typeof details !== "object") return details;
  if (Array.isArray(details)) return details.map(sanitizeDetails);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? "[redacted]"
      : sanitizeDetails(value);
  }
  return result;
}

function entityLink(entity: string, entityId: string | null): string | null {
  if (!entityId) return null;
  if (entity === "Customer") return `/customers/${entityId}`;
  if (entity === "AMLAlert") return `/aml-alerts/${entityId}`;
  if (entity === "AMLCase") return `/aml-cases/${entityId}`;
  return null;
}

async function fetchState(logId: string): Promise<PageState> {
  try {
    // No GET-by-id endpoint exists for audit logs, so the same 100-row
    // list is fetched and searched client-side. If the event isn't in
    // that recent window, it genuinely can't be looked up — the honest
    // "not found" message below reflects that limitation exactly.
    const res = await getAuditLogs();
    const match = res.logs.find((log) => log.id === logId);
    return match ? { phase: "ready", log: match } : { phase: "not-found" };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Unable to load this event.";
    return { phase: "error", message };
  }
}

function AuditLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>(() =>
    id ? { phase: "loading" } : { phase: "not-found" }
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchState(id).then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.phase === "loading") {
    return (
      <section className="customer-profile" aria-busy="true">
        <p className="customer-profile__loading">Loading audit event…</p>
      </section>
    );
  }

  if (state.phase === "not-found") {
    return (
      <section className="customer-profile">
        <h1 className="dashboard__heading">Audit event not found</h1>
        <p className="customer-profile__not-found-body">
          This event isn&apos;t in the most recent 100 audit events — the
          backend has no way to look up an older event directly.
        </p>
        <Link to="/audit" className="access-denied__link">
          Return to Audit Logs
        </Link>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="customer-profile">
        <h1 className="dashboard__heading">Audit event</h1>
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load this event — {state.message}
          </p>
        </div>
      </section>
    );
  }

  const { log } = state;
  const link = entityLink(log.entity, log.entityId);
  const sanitized = sanitizeDetails(log.details);

  return (
    <section className="customer-profile">
      <div>
        <Link to="/audit" className="customer-profile__back">
          ← Audit Logs
        </Link>
        <h1 className="customer-profile__heading">{humanizeLabel(log.action)}</h1>
      </div>

      <div className="profile-panel">
        <h2 className="profile-panel__title">Event information</h2>
        <dl className="profile-panel__list">
          <div className="profile-panel__row">
            <dt>Actor</dt>
            <dd>
              {log.user ? (
                <Link to={`/audit?actor=${log.user.id}`}>
                  {log.user.name} ({humanizeLabel(log.user.role)})
                </Link>
              ) : (
                "System / unauthenticated"
              )}
            </dd>
          </div>
          {log.user && (
            <div className="profile-panel__row">
              <dt>Actor email</dt>
              <dd>{log.user.email}</dd>
            </div>
          )}
          <div className="profile-panel__row">
            <dt>Entity</dt>
            <dd>
              {link ? (
                <Link to={link}>
                  {log.entity} {log.entityId}
                </Link>
              ) : (
                `${log.entity}${log.entityId ? ` ${log.entityId}` : ""}`
              )}
            </dd>
          </div>
          <div className="profile-panel__row">
            <dt>Timestamp</dt>
            <dd>{formatDateTime(log.createdAt)}</dd>
          </div>
          <div className="profile-panel__row">
            <dt>IP address</dt>
            <dd>{log.ipAddress ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {sanitized !== null && sanitized !== undefined && (
        <div className="profile-panel">
          <h2 className="profile-panel__title">Metadata</h2>
          <pre className="audit-detail__metadata">
            {JSON.stringify(sanitized, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}

export default AuditLogDetailPage;
