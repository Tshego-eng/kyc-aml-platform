import type { RecentAuditLog } from "./dashboard";

// GET /api/audit — shape matches the dashboard's recentAuditLogs items
// exactly (server/src/controllers/audit.controller.ts), reused here
// rather than redefined.
export interface AuditLogsResponse {
  logs: RecentAuditLog[];
}
