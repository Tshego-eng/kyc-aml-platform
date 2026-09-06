import type { RiskLevel, AlertType, KycStatus } from "./dashboard";

// GET /api/dashboard/high-risk-customers item, and the identical shape
// embedded in GET /api/dashboard/risk-intelligence's highRiskCustomers
// (server/src/services/dashboard.service.ts `getHighRiskCustomers`).
export interface HighRiskCustomer {
  customerId: string;
  name: string;
  email: string | null;
  kycStatus: KycStatus;
  riskLevel: RiskLevel | undefined;
  riskScore: number | undefined;
  riskReasons: unknown;
  riskAssessmentDate: string | undefined;
  activeAlertCount: number;
  criticalAlertCount: number;
}

// getRepeatAMLAlertCustomers() — customers with 2+ AML alerts.
export interface RepeatAlertCustomer {
  customerId: string;
  name: string;
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  unresolvedAlerts: number;
  alertTypes: AlertType[];
  latestAlertAt: string | null;
}

// getSuspiciousPatterns() — alerts grouped by type across the whole system.
export interface SuspiciousPattern {
  type: AlertType;
  alertCount: number;
  affectedCustomers: number;
  criticalCount: number;
  unresolvedCount: number;
}

// getComplianceOfficerWorkload() — one row per COMPLIANCE_OFFICER user.
export interface ComplianceOfficerWorkload {
  officerId: string;
  officerName: string;
  officerEmail: string;
  totalCases: number;
  activeCases: number;
  escalatedCases: number;
  resolvedCases: number;
}

export interface RiskIntelligence {
  highRiskCustomers: HighRiskCustomer[];
  repeatAMLAlertCustomers: RepeatAlertCustomer[];
  suspiciousPatterns: SuspiciousPattern[];
  complianceOfficerWorkload: ComplianceOfficerWorkload[];
}

// GET /api/dashboard/risk-intelligence
export interface RiskIntelligenceResponse {
  intelligence: RiskIntelligence;
}

// getKYCAndRiskAnalytics() — a KYC-status x risk-level crosstab, not a
// partition (categories overlap/don't sum to totalCustomers).
export interface KycRiskAnalytics {
  totalCustomers: number;
  verifiedHighRisk: number;
  verifiedCriticalRisk: number;
  pendingHighRisk: number;
  pendingCriticalRisk: number;
  rejectedHighRisk: number;
  rejectedCriticalRisk: number;
  customersWithoutRiskAssessment: number;
}

// GET /api/dashboard/kyc-risk
export interface KycRiskAnalyticsResponse {
  analytics: KycRiskAnalytics;
}
