import { httpClient } from "./httpClient";
import type { AuditLogsResponse } from "../types/audit";

// GET /api/audit — ADMIN/COMPLIANCE_OFFICER only, no query params, fixed
// to the latest 100 system-wide events (server/src/controllers/audit.controller.ts).
export function getAuditLogs(): Promise<AuditLogsResponse> {
  return httpClient.get<AuditLogsResponse>("/audit");
}
