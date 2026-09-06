import { httpClient } from "./httpClient";
import type {
  AMLAlertsListResponse,
  AMLAlertDetailResponse,
  UpdateAlertStatusResponse,
  AMLCasesListResponse,
  AMLCaseDetailResponse,
  AssignCaseResponse,
  UpdateCaseStatusResponse,
  AddNoteResponse,
  AddEvidenceResponse,
  AMLCaseStatus,
  RegulatoryDecision,
} from "../types/aml";
import type {
  DecisionRecommendation,
  EscalationEvaluation,
  DecisionValidationResult,
  CaseDecision,
} from "../types/decision";
import type { AlertStatus } from "../types/dashboard";

// GET /api/aml-alerts?status= — server-side status filtering is
// supported (server/src/controllers/aml-alert.controller.ts reads
// req.query.status directly); no other query params exist.
export function getAMLAlerts(
  status?: AlertStatus
): Promise<AMLAlertsListResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return httpClient.get<AMLAlertsListResponse>(`/aml-alerts${query}`);
}

// GET /api/aml-alerts/:id
export function getAMLAlert(alertId: string): Promise<AMLAlertDetailResponse> {
  return httpClient.get<AMLAlertDetailResponse>(`/aml-alerts/${alertId}`);
}

// PATCH /api/aml-alerts/:id/status
export function updateAMLAlertStatus(
  alertId: string,
  status: AlertStatus
): Promise<UpdateAlertStatusResponse> {
  return httpClient.patch<UpdateAlertStatusResponse>(
    `/aml-alerts/${alertId}/status`,
    { status }
  );
}

// GET /api/aml-cases?status= — same server-side status filtering as
// alerts (server/src/controllers/aml-case.controller.ts).
export function getAMLCases(
  status?: AMLCaseStatus
): Promise<AMLCasesListResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return httpClient.get<AMLCasesListResponse>(`/aml-cases${query}`);
}

// GET /api/aml-cases/:id — the canonical case detail route (there is
// also a legacy GET /api/cases/:id alias, not used here).
export function getAMLCase(caseId: string): Promise<AMLCaseDetailResponse> {
  return httpClient.get<AMLCaseDetailResponse>(`/aml-cases/${caseId}`);
}

// PATCH /api/aml-cases/:id/assign — body is { reviewerId }. There is no
// backend endpoint to list eligible officers, so the caller supplies a
// user ID directly.
export function assignAMLCase(
  caseId: string,
  reviewerId: string
): Promise<AssignCaseResponse> {
  return httpClient.patch<AssignCaseResponse>(`/aml-cases/${caseId}/assign`, {
    reviewerId,
  });
}

export interface UpdateCaseStatusInput {
  status: AMLCaseStatus;
  resolution?: string;
  regulatoryDecision?: RegulatoryDecision;
  regulatoryReason?: string;
}

// PATCH /api/aml-cases/:id/status
export function updateAMLCaseStatus(
  caseId: string,
  input: UpdateCaseStatusInput
): Promise<UpdateCaseStatusResponse> {
  return httpClient.patch<UpdateCaseStatusResponse>(
    `/aml-cases/${caseId}/status`,
    input
  );
}

// POST /api/aml-cases/:id/notes — body is { note }.
export function addInvestigationNote(
  caseId: string,
  note: string
): Promise<AddNoteResponse> {
  return httpClient.post<AddNoteResponse>(`/aml-cases/${caseId}/notes`, {
    note,
  });
}

// POST /api/aml-cases/:id/evidence — metadata only ({ fileName,
// fileType?, description? }); the backend does not accept file uploads.
export function addCaseEvidence(
  caseId: string,
  fileName: string,
  fileType?: string,
  description?: string
): Promise<AddEvidenceResponse> {
  return httpClient.post<AddEvidenceResponse>(`/aml-cases/${caseId}/evidence`, {
    fileName,
    ...(fileType ? { fileType } : {}),
    ...(description ? { description } : {}),
  });
}

// GET /api/aml-cases/:id/decision-recommendation — read-only, computed
// from the customer's current risk/alerts/KYC data. Not an AI system;
// a deterministic backend rules engine (Step 32).
export function getCaseDecisionRecommendation(
  caseId: string
): Promise<DecisionRecommendation> {
  return httpClient.get<DecisionRecommendation>(
    `/aml-cases/${caseId}/decision-recommendation`
  );
}

// GET /api/aml-cases/:id/escalation-evaluation
export function getCaseEscalationEvaluation(
  caseId: string
): Promise<EscalationEvaluation> {
  return httpClient.get<EscalationEvaluation>(
    `/aml-cases/${caseId}/escalation-evaluation`
  );
}

// POST /api/aml-cases/:id/validate-decision — body { decision }. This is
// a pure validation check: it never mutates the case. Applying the
// decision still requires a separate call to updateAMLCaseStatus().
export function validateCaseDecision(
  caseId: string,
  decision: CaseDecision
): Promise<DecisionValidationResult> {
  return httpClient.post<DecisionValidationResult>(
    `/aml-cases/${caseId}/validate-decision`,
    { decision }
  );
}
