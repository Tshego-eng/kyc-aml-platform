import { httpClient } from "./httpClient";

// Matches the literal response shape returned by GET /api/health
// in server/src/index.ts.
export interface HealthCheckResponse {
  status: string;
  message: string;
}

export function checkHealth(): Promise<HealthCheckResponse> {
  return httpClient.get<HealthCheckResponse>("/health");
}
