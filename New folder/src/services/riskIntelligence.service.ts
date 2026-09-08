import { httpClient } from "./httpClient";
import type {
  RiskIntelligenceResponse,
  KycRiskAnalyticsResponse,
} from "../types/riskIntelligence";

// GET /api/dashboard/risk-intelligence — a single aggregated call
// covering high-risk customers, repeat-alert customers, suspicious
// patterns, and compliance officer workload
// (server/src/services/dashboard.service.ts `getRiskIntelligence`),
// used instead of calling those 4 narrower endpoints separately.
export function getRiskIntelligence(): Promise<RiskIntelligenceResponse> {
  return httpClient.get<RiskIntelligenceResponse>(
    "/dashboard/risk-intelligence"
  );
}

// GET /api/dashboard/kyc-risk — KYC status x risk level crosstab, not
// covered by the risk-intelligence aggregate above.
export function getKycRiskAnalytics(): Promise<KycRiskAnalyticsResponse> {
  return httpClient.get<KycRiskAnalyticsResponse>("/dashboard/kyc-risk");
}
