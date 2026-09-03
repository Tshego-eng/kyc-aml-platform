import { httpClient } from "./httpClient";
import type {
  CustomersListResponse,
  KYCOverviewResponse,
  PerformKYCCheckResponse,
  EvaluateKYCStatusResponse,
  CreateKYCReviewResponse,
  ReviewDecision,
} from "../types/customer";
import type { KycCheckType } from "../types/dashboard";

// GET /api/customers — no server-side search, filter, or pagination
// support (server/src/controllers/customer.controller.ts ignores
// req.query entirely), so the full list is returned every time.
export function getCustomers(): Promise<CustomersListResponse> {
  return httpClient.get<CustomersListResponse>("/customers");
}

// GET /api/customers/:id/kyc-overview — the aggregated endpoint used for
// the whole profile page: customer + KYC checks + KYC review history +
// risk assessments in a single call.
export function getCustomerKycOverview(
  customerId: string
): Promise<KYCOverviewResponse> {
  return httpClient.get<KYCOverviewResponse>(
    `/customers/${customerId}/kyc-overview`
  );
}

// POST /api/customers/:id/kyc-checks
export function performKycCheck(
  customerId: string,
  checkType: KycCheckType
): Promise<PerformKYCCheckResponse> {
  return httpClient.post<PerformKYCCheckResponse>(
    `/customers/${customerId}/kyc-checks`,
    { checkType }
  );
}

// POST /api/customers/:id/kyc-status/evaluate
export function evaluateKycStatus(
  customerId: string
): Promise<EvaluateKYCStatusResponse> {
  return httpClient.post<EvaluateKYCStatusResponse>(
    `/customers/${customerId}/kyc-status/evaluate`
  );
}

// POST /api/customers/:id/kyc-review
export function createKycReview(
  customerId: string,
  decision: ReviewDecision,
  reason: string
): Promise<CreateKYCReviewResponse> {
  return httpClient.post<CreateKYCReviewResponse>(
    `/customers/${customerId}/kyc-review`,
    { decision, reason }
  );
}
