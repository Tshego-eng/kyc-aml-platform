import { Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/audit.service";
import {
  getAMLStatistics,
  getCaseStatistics,
  getDashboardSummary,
  getKYCStatistics,
  getRecentActivity,
  getRiskStatistics,
  getTransactionStatistics,
  getAMLAlertTrends,
  getKYCAndRiskAnalytics,
  getHighRiskCustomers,
  getRepeatAMLAlertCustomers,
  getSuspiciousPatterns,
  getComplianceOfficerWorkload,
  getRiskIntelligence,
} from "../services/dashboard.service";

const canViewAuditLogs = (role: string): boolean => {
  return role === "ADMIN" || role === "COMPLIANCE_OFFICER";
};

const logDashboardView = async (
  req: AuthenticatedRequest,
  endpoint: string
) => {
  await createAuditLog({
    userId: req.user!.userId,
    action: "DASHBOARD_VIEWED",
    entity: "Dashboard",
    details: {
      endpoint,
      role: req.user!.role,
    },
    ipAddress: req.ip,
  });
};

export const getDashboardSummaryController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const summary = await getDashboardSummary(canViewAuditLogs(req.user.role));

    await logDashboardView(req, "summary");

    return res.json({
      summary,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return res.status(500).json({
      error: "Failed to retrieve dashboard summary",
    });
  }
};

export const getDashboardKYCController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const kyc = await getKYCStatistics();

    await logDashboardView(req, "kyc");

    return res.json({
      kyc,
    });
  } catch (error) {
    console.error("Dashboard KYC error:", error);

    return res.status(500).json({
      error: "Failed to retrieve dashboard KYC statistics",
    });
  }
};

export const getDashboardAMLController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const aml = await getAMLStatistics();

    await logDashboardView(req, "aml");

    return res.json({
      aml,
    });
  } catch (error) {
    console.error("Dashboard AML error:", error);

    return res.status(500).json({
      error: "Failed to retrieve dashboard AML statistics",
    });
  }
};

export const getDashboardRiskController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const risk = await getRiskStatistics();

    await logDashboardView(req, "risk");

    return res.json({
      risk,
    });
  } catch (error) {
    console.error("Dashboard risk error:", error);

    return res.status(500).json({
      error: "Failed to retrieve dashboard risk statistics",
    });
  }
};

export const getDashboardCasesController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const cases = await getCaseStatistics();

    await logDashboardView(req, "cases");

    return res.json({
      cases,
    });
  } catch (error) {
    console.error("Dashboard cases error:", error);

    return res.status(500).json({
      error: "Failed to retrieve dashboard case statistics",
    });
  }
};

export const getDashboardTransactionsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const transactions = await getTransactionStatistics();

    await logDashboardView(req, "transactions");

    return res.json({
      transactions,
    });
  } catch (error) {
    console.error("Dashboard transactions error:", error);

    return res.status(500).json({
      error: "Failed to retrieve dashboard transaction statistics",
    });
  }
};

export const getDashboardActivityController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const activity = await getRecentActivity(canViewAuditLogs(req.user.role));

    await logDashboardView(req, "activity");

    return res.json({
      activity,
    });
  } catch (error) {
    console.error("Dashboard activity error:", error);

    return res.status(500).json({
      error: "Failed to retrieve dashboard activity",
    });
  }
};

export const getDashboardAMLTrendsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const days = Number(req.query.days ?? 30);

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({
        error: "days must be an integer between 1 and 365",
      });
    }

    const trends = await getAMLAlertTrends(days);

    await logDashboardView(req, "aml-trends");

    return res.json({
      trends,
    });
  } catch (error) {
    console.error("Dashboard AML trends error:", error);

    return res.status(500).json({
      error: "Failed to retrieve AML alert trends",
    });
  }
};

export const getDashboardKYCAndRiskController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const analytics = await getKYCAndRiskAnalytics();

    await logDashboardView(req, "kyc-risk-analytics");

    return res.json({
      analytics,
    });
  } catch (error) {
    console.error("Dashboard KYC/risk analytics error:", error);

    return res.status(500).json({
      error: "Failed to retrieve KYC and risk analytics",
    });
  }
};
export const getHighRiskCustomersController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const customers = await getHighRiskCustomers();

    return res.json({
      customers,
    });
  } catch (error) {
    console.error("High-risk customer analytics error:", error);

    return res.status(500).json({
      error: "Failed to retrieve high-risk customers",
    });
  }
};

export const getRepeatAMLAlertCustomersController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const customers = await getRepeatAMLAlertCustomers();

    return res.json({
      customers,
    });
  } catch (error) {
    console.error("Repeat AML alert analytics error:", error);

    return res.status(500).json({
      error: "Failed to retrieve repeat AML alert customers",
    });
  }
};

export const getSuspiciousPatternsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const patterns = await getSuspiciousPatterns();

    return res.json({
      patterns,
    });
  } catch (error) {
    console.error("Suspicious pattern analytics error:", error);

    return res.status(500).json({
      error: "Failed to retrieve suspicious patterns",
    });
  }
};

export const getComplianceOfficerWorkloadController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const workload = await getComplianceOfficerWorkload();

    return res.json({
      workload,
    });
  } catch (error) {
    console.error("Compliance officer workload error:", error);

    return res.status(500).json({
      error: "Failed to retrieve compliance officer workload",
    });
  }
};

export const getRiskIntelligenceController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const intelligence = await getRiskIntelligence();

    await logDashboardView(req, "risk-intelligence");

    return res.json({
      intelligence,
    });
  } catch (error) {
    console.error("Risk intelligence error:", error);

    return res.status(500).json({
      error: "Failed to retrieve risk intelligence",
    });
  }
};