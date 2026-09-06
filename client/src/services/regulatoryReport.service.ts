import { httpClient } from "./httpClient";
import type {
  CreateRegulatoryReportResponse,
  SubmitRegulatoryReportResponse,
  AcknowledgeRegulatoryReportResponse,
  RegulatoryReportType,
} from "../types/regulatoryReport";

/**
 * The backend has no GET endpoint for regulatory reports at all — no
 * list route and no get-by-id route (server/src/routes/regulatory-report.routes.ts
 * only defines POST create, PATCH submit, and PATCH acknowledge). Every
 * one of those three responses includes the full report object, which
 * is the only way the frontend can ever observe report data.
 */

// POST /api/aml-cases/:caseId/regulatory-reports — ADMIN/COMPLIANCE_OFFICER.
export function createRegulatoryReport(
  caseId: string,
  reason: string,
  reportType?: RegulatoryReportType
): Promise<CreateRegulatoryReportResponse> {
  return httpClient.post<CreateRegulatoryReportResponse>(
    `/aml-cases/${caseId}/regulatory-reports`,
    { reason, ...(reportType ? { reportType } : {}) }
  );
}

// PATCH /api/regulatory-reports/:id/submit — requires status DRAFT.
// referenceNumber is optional here; if omitted, the report stays
// unreferenced until acknowledged.
export function submitRegulatoryReport(
  reportId: string,
  referenceNumber?: string
): Promise<SubmitRegulatoryReportResponse> {
  return httpClient.patch<SubmitRegulatoryReportResponse>(
    `/regulatory-reports/${reportId}/submit`,
    referenceNumber ? { referenceNumber } : {}
  );
}

// PATCH /api/regulatory-reports/:id/acknowledge — requires status
// SUBMITTED. The backend generates its own referenceNumber
// (`REG-${Date.now()}`) here, overwriting anything supplied earlier.
export function acknowledgeRegulatoryReport(
  reportId: string
): Promise<AcknowledgeRegulatoryReportResponse> {
  return httpClient.patch<AcknowledgeRegulatoryReportResponse>(
    `/regulatory-reports/${reportId}/acknowledge`
  );
}
