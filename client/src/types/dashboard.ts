import type { UserRole } from "./auth";

// Enum-like literal unions mirror prisma/schema.prisma exactly. Case and
// alert statuses use the subset actually normalized by the backend's own
// CASE_STATUSES/ALERT_STATUSES constants (server/src/services/dashboard.service.ts),
// which is what the API actually returns as object keys.
export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type CheckStatus = "PENDING" | "PASSED" | "FAILED";
export type KycCheckType = "IDENTITY" | "ADDRESS" | "DATE_OF_BIRTH" | "EMAIL" | "PHONE";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "ESCALATED"
  | "RESOLVED"
  | "FALSE_POSITIVE";
export type CaseStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";
export type AlertType =
  | "LARGE_TRANSACTION"
  | "STRUCTURING"
  | "RAPID_MOVEMENT"
  | "HIGH_RISK_COUNTRY"
  | "UNUSUAL_ACTIVITY"
  | "PEP_MATCH"
  | "INCOME_MISMATCH";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "PAYMENT";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

export interface RiskStatistics {
  assessedCustomers: number;
  byLevel: Record<RiskLevel, number>;
  lowRiskCustomers: number;
  mediumRiskCustomers: number;
  highRiskCustomers: number;
  criticalRiskCustomers: number;
}

export interface KycStatistics {
  customersByStatus: Record<KycStatus, number>;
  pendingCustomers: number;
  verifiedCustomers: number;
  rejectedCustomers: number;
  checksByStatus: Record<CheckStatus, number>;
  checksPassed: number;
  checksFailed: number;
}

export interface AmlStatistics {
  totalAlerts: number;
  byType: Record<AlertType, number>;
  bySeverity: Record<RiskLevel, number>;
  byStatus: Record<AlertStatus, number>;
  openAlerts: number;
  investigatingAlerts: number;
  escalatedAlerts: number;
  resolvedAlerts: number;
  falsePositiveAlerts: number;
}

export interface CaseStatistics {
  totalCases: number;
  byStatus: Record<CaseStatus, number>;
  byPriority: Record<RiskLevel, number>;
  openCases: number;
  investigatingCases: number;
  escalatedCases: number;
  resolvedCases: number;
  closedCases: number;
  assignedToComplianceOfficers: Array<{
    officer: { id: string; name: string; email: string };
    assignedCaseCount: number;
  }>;
}

export interface TransactionStatistics {
  totalTransactions: number;
  totalTransactionValueByCurrency: Array<{
    currency: string;
    totalValue: string;
    transactionCount: number;
  }>;
  byType: Record<TransactionType, number>;
  byStatus: Record<TransactionStatus, number>;
  suspiciousTransactionCount: number;
  highRiskTransactionCount: number;
  suspiciousTransactionRate: number;
  highRiskTransactionRate: number;
}

interface ActivityCustomerRef {
  id: string;
  firstName: string;
  lastName: string;
  kycStatus: KycStatus;
}

export interface RecentAmlAlert {
  id: string;
  type: AlertType;
  severity: RiskLevel;
  status: AlertStatus;
  description: string;
  createdAt: string;
  customer: ActivityCustomerRef;
  transaction: {
    id: string;
    amount: string;
    currency: string;
    type: TransactionType;
    status: TransactionStatus;
    timestamp: string;
  } | null;
}

export interface RecentKycCheck {
  id: string;
  checkType: KycCheckType;
  status: CheckStatus;
  score: number | null;
  createdAt: string;
  customer: ActivityCustomerRef;
}

export interface RecentComplianceCase {
  id: string;
  status: CaseStatus;
  priority: RiskLevel;
  summary: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  customer: ActivityCustomerRef;
  assignedTo: { id: string; name: string; role: UserRole } | null;
  alert: {
    id: string;
    type: AlertType;
    severity: RiskLevel;
    status: AlertStatus;
  } | null;
}

export interface RecentAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: UserRole };
}

export interface DashboardActivity {
  recentAMLAlerts: RecentAmlAlert[];
  recentKYCChecks: RecentKycCheck[];
  recentComplianceCases: RecentComplianceCase[];
  // Only populated for ADMIN/COMPLIANCE_OFFICER — see canViewAuditLogs()
  // in server/src/controllers/dashboard.controller.ts.
  recentAuditLogs: RecentAuditLog[];
  auditLogsAvailable: boolean;
}

export interface DashboardComplianceOverview {
  totalCustomers: number;
  pendingKYCCustomers: number;
  verifiedCustomers: number;
  rejectedCustomers: number;
  totalAMLAlerts: number;
  openAMLAlerts: number;
  investigatingAMLAlerts: number;
  escalatedAMLAlerts: number;
  resolvedAMLAlerts: number;
  totalAMLCases: number;
  openCases: number;
  investigatingCases: number;
  escalatedCases: number;
  resolvedCases: number;
}

export interface DashboardSummary {
  generatedAt: string;
  compliance: DashboardComplianceOverview;
  risk: RiskStatistics;
  kyc: KycStatistics;
  aml: AmlStatistics;
  cases: CaseStatistics;
  transactions: TransactionStatistics;
  activity: DashboardActivity;
}

// Matches GET /api/dashboard/summary exactly (server/src/controllers/dashboard.controller.ts).
export interface DashboardSummaryResponse {
  summary: DashboardSummary;
}

export interface AmlAlertTrendPoint {
  date: string;
  total: number;
  highRisk: number;
  critical: number;
  open: number;
}

// Matches GET /api/dashboard/aml/trends exactly.
export interface DashboardAmlTrendsResponse {
  trends: AmlAlertTrendPoint[];
}
