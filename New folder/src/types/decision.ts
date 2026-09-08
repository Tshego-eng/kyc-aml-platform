import type { RiskLevel } from "./dashboard";

// Matches server/src/types/aml-case.ts CaseDecision exactly.
export type CaseDecision =
  | "CONTINUE_INVESTIGATION"
  | "FALSE_POSITIVE"
  | "RESOLVE"
  | "ESCALATE"
  | "REGULATORY_REPORT";

// GET /api/aml-cases/:id/decision-recommendation
// (server/src/services/case-decision.service.ts).
export interface DecisionRecommendation {
  caseId: string;
  customerId: string;
  recommendation: CaseDecision;
  riskLevel: RiskLevel | null;
  riskScore: number | null;
  activeAlertCount: number;
  criticalAlertCount: number;
  highAlertCount: number;
  failedKYCCheckCount: number;
  reasons: string[];
}

// GET /api/aml-cases/:id/escalation-evaluation
// (server/src/services/case-escalation.service.ts).
export interface EscalationEvaluation {
  caseId: string;
  shouldEscalate: boolean;
  reasons: string[];
  riskLevel: RiskLevel | null;
  criticalAlertCount: number;
  highAlertCount: number;
  failedKYCCheckCount: number;
}

// POST /api/aml-cases/:id/validate-decision success response
// (server/src/services/case-decision-validation.service.ts). Any
// invalid decision throws instead of returning valid: false, so this
// shape only ever represents a successful validation.
export interface DecisionValidationResult {
  valid: true;
  caseId: string;
  currentStatus: string;
  decision: CaseDecision;
}
