import type { UserRole } from "./auth";
import type {
  RiskLevel,
  AlertType,
  AlertStatus,
  TransactionType,
  TransactionStatus,
  KycStatus,
} from "./dashboard";
import type { Customer, KYCCheck, RiskAssessment } from "./customer";

// Full case status enum (server/src/controllers/aml-case.controller.ts:
// "status must be one of OPEN, INVESTIGATING, ESCALATED, RESOLVED,
// CLOSED, or FALSE_POSITIVE"). Distinct from dashboard.ts's CaseStatus,
// which is only the narrower grouping set the dashboard summary uses.
export type AMLCaseStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED"
  | "FALSE_POSITIVE";

export type RegulatoryDecision =
  | "FALSE_POSITIVE"
  | "NO_FURTHER_ACTION"
  | "INTERNAL_ESCALATION"
  | "REGULATORY_REPORT";

interface CustomerRef {
  id: string;
  firstName: string;
  lastName: string;
  kycStatus: KycStatus;
}

interface UserRef {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthorRef {
  id: string;
  name: string;
  email: string;
}

// Narrow transaction shape used inside the alert list
// (server/src/services/aml-alert.service.ts `getAMLAlerts` select).
export interface AlertTransactionRef {
  id: string;
  amount: string;
  currency: string;
  country: string;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: string;
}

// Full transaction shape (unselected include), used on alert/case detail.
export interface TransactionFull {
  id: string;
  customerId: string;
  amount: string;
  currency: string;
  country: string;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: string;
}

// GET /api/aml-alerts item shape.
export interface AMLAlertListItem {
  id: string;
  customerId: string;
  transactionId: string | null;
  type: AlertType;
  severity: RiskLevel;
  status: AlertStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  customer: CustomerRef;
  transaction: AlertTransactionRef | null;
}

export interface AMLAlertsListResponse {
  alerts: AMLAlertListItem[];
}

// GET /api/aml-alerts/:id — customer/transaction are full includes here,
// not the select-narrowed shape used in the list.
export interface AMLAlertDetail {
  id: string;
  customerId: string;
  transactionId: string | null;
  type: AlertType;
  severity: RiskLevel;
  status: AlertStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  transaction: TransactionFull | null;
}

export interface AMLAlertDetailResponse {
  alert: AMLAlertDetail;
}

// PATCH /api/aml-alerts/:id/status
export interface UpdateAlertStatusResponse {
  message: string;
  alert: AMLAlertDetail;
}

// Alert reference embedded in a case (full AMLAlert row, no relations).
export interface CaseAlertRef {
  id: string;
  customerId: string;
  transactionId: string | null;
  type: AlertType;
  severity: RiskLevel;
  status: AlertStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// GET /api/aml-cases list item.
export interface AMLCaseListItem {
  id: string;
  alertId: string;
  customerId: string;
  assignedToId: string | null;
  status: AMLCaseStatus;
  priority: RiskLevel;
  decision: string | null;
  summary: string | null;
  resolution: string | null;
  regulatoryDecision: RegulatoryDecision | null;
  regulatoryReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  alert: CaseAlertRef;
  customer: CustomerRef;
  assignedTo: UserRef | null;
}

export interface AMLCasesListResponse {
  cases: AMLCaseListItem[];
}

export interface InvestigationNote {
  id: string;
  caseId: string;
  authorId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  author: AuthorRef;
}

export interface CaseEvidence {
  id: string;
  caseId: string;
  uploadedBy: string;
  fileName: string;
  fileType: string | null;
  description: string | null;
  createdAt: string;
  uploader: AuthorRef;
}

// Customer as embedded in case detail: full customer fields plus
// kycChecks, riskAssessments, and transactions (no kycReviews, no
// amlAlerts — server/src/services/aml-case.service.ts `getAMLCaseById`).
export interface CaseCustomer extends Customer {
  kycChecks: KYCCheck[];
  riskAssessments: RiskAssessment[];
  transactions: TransactionFull[];
}

// GET /api/aml-cases/:id
export interface AMLCaseDetail {
  id: string;
  alertId: string;
  customerId: string;
  assignedToId: string | null;
  status: AMLCaseStatus;
  priority: RiskLevel;
  decision: string | null;
  summary: string | null;
  resolution: string | null;
  regulatoryDecision: RegulatoryDecision | null;
  regulatoryReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  alert: CaseAlertRef;
  customer: CaseCustomer;
  assignedTo: UserRef | null;
  notes: InvestigationNote[];
  evidence: CaseEvidence[];
}

export interface AMLCaseDetailResponse {
  case: AMLCaseDetail;
}

export interface AssignCaseResponse {
  message: string;
  case: {
    id: string;
    assignedToId: string;
    status: AMLCaseStatus;
    assignedTo: UserRef;
  };
}

export interface UpdateCaseStatusResponse {
  message: string;
  case: AMLCaseDetail;
}

export interface AddNoteResponse {
  message: string;
  note: InvestigationNote;
}

export interface AddEvidenceResponse {
  message: string;
  evidence: CaseEvidence;
}
