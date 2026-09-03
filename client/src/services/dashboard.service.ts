import { httpClient } from "./httpClient";
import type {
  DashboardSummaryResponse,
  DashboardAmlTrendsResponse,
} from "../types/dashboard";

// GET /api/dashboard/summary — the aggregated dashboard endpoint, used
// as the single primary data source instead of calling the 12 other
// narrower dashboard endpoints individually.
export function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  return httpClient.get<DashboardSummaryResponse>("/dashboard/summary");
}

// GET /api/dashboard/aml/trends?days=N — the only genuine time-series
// data the backend exposes, used for the alert trend chart.
export function getDashboardAmlTrends(
  days = 30
): Promise<DashboardAmlTrendsResponse> {
  return httpClient.get<DashboardAmlTrendsResponse>(
    `/dashboard/aml/trends?days=${days}`
  );
}
