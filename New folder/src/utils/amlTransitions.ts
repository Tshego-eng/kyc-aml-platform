import type { AlertStatus } from "../types/dashboard";
import type { AMLCaseStatus } from "../types/aml";

// Mirrors isValidStatusTransition() in
// server/src/services/aml-alert.service.ts exactly. The frontend uses
// this only to disable obviously-invalid options in the UI; the backend
// remains the actual authority and is still checked on every request.
export const ALERT_STATUS_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  OPEN: ["INVESTIGATING", "FALSE_POSITIVE"],
  INVESTIGATING: ["ESCALATED", "RESOLVED", "FALSE_POSITIVE"],
  ESCALATED: ["INVESTIGATING", "RESOLVED"],
  RESOLVED: [],
  FALSE_POSITIVE: [],
};

// Mirrors allowedTransitions in server/src/services/aml-case.service.ts
// exactly (ESCALATED -> ESCALATED self-transition deduped out since it's
// a no-op in the UI).
export const CASE_STATUS_TRANSITIONS: Record<AMLCaseStatus, AMLCaseStatus[]> = {
  OPEN: ["INVESTIGATING", "FALSE_POSITIVE"],
  INVESTIGATING: ["ESCALATED", "RESOLVED", "FALSE_POSITIVE"],
  ESCALATED: ["INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"],
  RESOLVED: ["FALSE_POSITIVE"],
  CLOSED: [],
  FALSE_POSITIVE: ["ESCALATED"],
};

// Statuses where updateAMLCaseStatus() requires a non-empty `resolution`.
export const CASE_STATUSES_REQUIRING_RESOLUTION: AMLCaseStatus[] = [
  "FALSE_POSITIVE",
  "RESOLVED",
  "ESCALATED",
];

// Statuses where a `regulatoryDecision` is required.
export const CASE_STATUSES_REQUIRING_REGULATORY_DECISION: AMLCaseStatus[] = [
  "RESOLVED",
  "FALSE_POSITIVE",
];
