import type { UserRole } from "./auth";
import type { KycStatus, CheckStatus, KycCheckType, RiskLevel } from "./dashboard";

// Matches server/src/services/customer.service.ts `getCustomers` select
// and `getCustomerById`/`getKYCOverview` base fields exactly.
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  idNumber: string;
  country: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  annualIncome: string | null;
  sourceOfFunds: string | null;
  kycStatus: KycStatus;
  createdAt: string;
  updatedAt: string;
}

// GET /api/customers
export interface CustomersListResponse {
  customers: Customer[];
}

export interface KYCCheck {
  id: string;
  customerId: string;
  checkType: KycCheckType;
  status: CheckStatus;
  score: number | null;
  notes: string | null;
  createdAt: string;
}

export interface RiskAssessment {
  id: string;
  customerId: string;
  score: number;
  level: RiskLevel;
  reasons: unknown;
  createdAt: string;
}

export type ReviewDecision = "APPROVE" | "REJECT" | "REQUEST_REVIEW";

interface ReviewerRef {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Shape returned inside kycReviews/history lists (includes reviewer).
export interface KYCReviewWithReviewer {
  id: string;
  customerId: string;
  reviewerId: string;
  decision: ReviewDecision;
  reason: string;
  createdAt: string;
  updatedAt: string;
  reviewer: ReviewerRef;
}

// Shape returned directly from POST .../kyc-review (no nested reviewer —
// server/src/services/kyc-review.service.ts `createKYCReview` returns the
// raw prisma.kYCReview.create() result).
export interface KYCReviewBase {
  id: string;
  customerId: string;
  reviewerId: string;
  decision: ReviewDecision;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface KYCOverviewCustomer extends Customer {
  kycChecks: KYCCheck[];
  kycReviews: KYCReviewWithReviewer[];
  riskAssessments: RiskAssessment[];
}

// GET /api/customers/:id/kyc-overview
export interface KYCOverviewResponse {
  customer: KYCOverviewCustomer;
}

// POST /api/customers/:id/kyc-checks
export interface PerformKYCCheckResponse {
  message: string;
  kycCheck: KYCCheck;
}

// POST /api/customers/:id/kyc-status/evaluate
export interface EvaluateKYCStatusResponse {
  message: string;
  status: KycStatus;
  reason: string;
}

// POST /api/customers/:id/kyc-review
export interface CreateKYCReviewResponse {
  message: string;
  review: KYCReviewBase;
  kycStatus: KycStatus;
}
