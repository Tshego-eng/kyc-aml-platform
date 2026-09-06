import type { UserRole } from "./auth";
import type { AMLCaseStatus } from "./aml";
import type { RiskLevel } from "./dashboard";
import type { Customer } from "./customer";

// Matches prisma/schema.prisma exactly. RegulatoryReportType currently
// has only one member on the backend.
export type RegulatoryReportType = "SUSPICIOUS_ACTIVITY";
export type RegulatoryReportStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED";

interface SubmitterRef {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// regulatoryReportInclude's `amlCase: true` returns the full AMLCase row
// with no nested relations (server/src/services/regulatory-report.service.ts).
interface EmbeddedAmlCase {
  id: string;
  alertId: string;
  customerId: string;
  assignedToId: string | null;
  status: AMLCaseStatus;
  priority: RiskLevel;
  decision: string | null;
  summary: string | null;
  resolution: string | null;
  regulatoryDecision: string | null;
  regulatoryReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

// Returned by createRegulatoryReport / submitRegulatoryReport /
// acknowledgeRegulatoryReport — all three use the same
// regulatoryReportInclude, so the shape is identical across all three
// endpoints.
export interface RegulatoryReport {
  id: string;
  caseId: string;
  customerId: string;
  submittedById: string;
  reportType: RegulatoryReportType;
  status: RegulatoryReportStatus;
  reason: string;
  referenceNumber: string | null;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
  amlCase: EmbeddedAmlCase;
  customer: Customer;
  submittedBy: SubmitterRef;
}

// POST /api/aml-cases/:caseId/regulatory-reports
export interface CreateRegulatoryReportResponse {
  message: string;
  report: RegulatoryReport;
}

// PATCH /api/regulatory-reports/:id/submit
export interface SubmitRegulatoryReportResponse {
  message: string;
  report: RegulatoryReport;
}

// PATCH /api/regulatory-reports/:id/acknowledge
export interface AcknowledgeRegulatoryReportResponse {
  message: string;
  report: RegulatoryReport;
}
