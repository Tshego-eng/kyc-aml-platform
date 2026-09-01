import prisma from "../lib/prisma";

const KYC_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
const CHECK_STATUSES = ["PENDING", "PASSED", "FAILED"] as const;
const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const ALERT_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "ESCALATED",
  "RESOLVED",
  "FALSE_POSITIVE",
] as const;
const CASE_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
const ALERT_TYPES = [
  "LARGE_TRANSACTION",
  "STRUCTURING",
  "RAPID_MOVEMENT",
  "HIGH_RISK_COUNTRY",
  "UNUSUAL_ACTIVITY",
  "PEP_MATCH",
  "INCOME_MISMATCH",
] as const;
const TRANSACTION_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER",
  "PAYMENT",
] as const;
const TRANSACTION_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REVERSED",
] as const;

const mapGroupedCounts = (
  groups: Array<{ _count: { _all: number } }>,
  field: string
): Record<string, number> => {
  return groups.reduce<Record<string, number>>((counts, group) => {
    const value = (group as unknown as Record<string, unknown>)[field];

    if (typeof value === "string") {
      counts[value] = group._count._all;
    }

    return counts;
  }, {});
};

const normalizeCounts = <T extends string>(
  values: readonly T[],
  counts: Record<string, number>
): Record<T, number> => {
  return values.reduce<Record<T, number>>((normalized, value) => {
    normalized[value] = counts[value] ?? 0;
    return normalized;
  }, {} as Record<T, number>);
};

const totalFromCounts = (counts: Record<string, number>): number => {
  return Object.values(counts).reduce((total, value) => total + value, 0);
};

const getCustomerKYCStatusCounts = async () => {
  const groups = await prisma.customer.groupBy({
    by: ["kycStatus"],
    _count: {
      _all: true,
    },
  });

  return normalizeCounts(
    KYC_STATUSES,
    mapGroupedCounts(groups, "kycStatus")
  );
};

const getKYCCheckStatusCounts = async () => {
  const groups = await prisma.kYCCheck.groupBy({
    by: ["status"],
    _count: {
      _all: true,
    },
  });

  return normalizeCounts(
    CHECK_STATUSES,
    mapGroupedCounts(groups, "status")
  );
};

const getAMLGroupedCounts = async () => {
  const [byTypeGroups, bySeverityGroups, byStatusGroups] = await Promise.all([
    prisma.aMLAlert.groupBy({
      by: ["type"],
      _count: {
        _all: true,
      },
    }),
    prisma.aMLAlert.groupBy({
      by: ["severity"],
      _count: {
        _all: true,
      },
    }),
    prisma.aMLAlert.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  return {
    byType: normalizeCounts(ALERT_TYPES, mapGroupedCounts(byTypeGroups, "type")),
    bySeverity: normalizeCounts(
      RISK_LEVELS,
      mapGroupedCounts(bySeverityGroups, "severity")
    ),
    byStatus: normalizeCounts(
      ALERT_STATUSES,
      mapGroupedCounts(byStatusGroups, "status")
    ),
  };
};

const getRiskLevelCounts = async () => {
  const latestRiskLevels = await prisma.$queryRaw<
    Array<{ level: string; count: number }>
  >`
    SELECT "level", COUNT(*)::int AS "count"
    FROM (
      SELECT DISTINCT ON ("customerId") "customerId", "level"
      FROM "RiskAssessment"
      ORDER BY "customerId", "createdAt" DESC, "id" DESC
    ) AS "latestRiskAssessment"
    GROUP BY "level"
  `;

  const counts = latestRiskLevels.reduce<Record<string, number>>(
    (result, item) => {
      result[item.level] = Number(item.count);
      return result;
    },
    {}
  );

  return normalizeCounts(RISK_LEVELS, counts);
};

export const getRiskStatistics = async () => {
  const byLevel = await getRiskLevelCounts();

  return {
    assessedCustomers: totalFromCounts(byLevel),
    byLevel,
    lowRiskCustomers: byLevel.LOW,
    mediumRiskCustomers: byLevel.MEDIUM,
    highRiskCustomers: byLevel.HIGH,
    criticalRiskCustomers: byLevel.CRITICAL,
  };
};

export const getKYCStatistics = async () => {
  const [customerStatusCounts, checkStatusCounts] = await Promise.all([
    getCustomerKYCStatusCounts(),
    getKYCCheckStatusCounts(),
  ]);

  return {
    customersByStatus: customerStatusCounts,
    pendingCustomers: customerStatusCounts.PENDING,
    verifiedCustomers: customerStatusCounts.VERIFIED,
    rejectedCustomers: customerStatusCounts.REJECTED,
    checksByStatus: checkStatusCounts,
    checksPassed: checkStatusCounts.PASSED,
    checksFailed: checkStatusCounts.FAILED,
  };
};

export const getAMLStatistics = async () => {
  const groupedCounts = await getAMLGroupedCounts();
  const totalAlerts = totalFromCounts(groupedCounts.byStatus);

  return {
    totalAlerts,
    byType: groupedCounts.byType,
    bySeverity: groupedCounts.bySeverity,
    byStatus: groupedCounts.byStatus,
    openAlerts: groupedCounts.byStatus.OPEN,
    investigatingAlerts: groupedCounts.byStatus.INVESTIGATING,
    escalatedAlerts: groupedCounts.byStatus.ESCALATED,
    resolvedAlerts: groupedCounts.byStatus.RESOLVED,
    falsePositiveAlerts: groupedCounts.byStatus.FALSE_POSITIVE,
  };
};

export const getCaseStatistics = async () => {
  const [byStatusGroups, byPriorityGroups, assignmentGroups, complianceOfficers] =
    await Promise.all([
      prisma.aMLCase.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),
      prisma.aMLCase.groupBy({
        by: ["priority"],
        _count: {
          _all: true,
        },
      }),
      prisma.aMLCase.groupBy({
        by: ["assignedToId"],
        where: {
          assignedToId: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.user.findMany({
        where: {
          role: "COMPLIANCE_OFFICER",
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

  const byStatus = normalizeCounts(
    CASE_STATUSES,
    mapGroupedCounts(byStatusGroups, "status")
  );
  const byPriority = normalizeCounts(
    RISK_LEVELS,
    mapGroupedCounts(byPriorityGroups, "priority")
  );
  const assignmentsByUserId = mapGroupedCounts(
    assignmentGroups,
    "assignedToId"
  );

  return {
    totalCases: totalFromCounts(byStatus),
    byStatus,
    byPriority,
    openCases: byStatus.OPEN,
    investigatingCases: byStatus.INVESTIGATING,
    escalatedCases: byStatus.ESCALATED,
    resolvedCases: byStatus.RESOLVED,
    closedCases: byStatus.CLOSED,
    assignedToComplianceOfficers: complianceOfficers.map((officer) => ({
      officer,
      assignedCaseCount: assignmentsByUserId[officer.id] ?? 0,
    })),
  };
};

export const getTransactionStatistics = async () => {
  const [
    totalTransactions,
    valueByCurrencyGroups,
    byTypeGroups,
    byStatusGroups,
    suspiciousTransactionCount,
    highRiskTransactionCount,
  ] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.groupBy({
      by: ["currency"],
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      _count: {
        _all: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.transaction.count({
      where: {
        amlAlerts: {
          some: {},
        },
      },
    }),
    prisma.transaction.count({
      where: {
        amlAlerts: {
          some: {
            severity: {
              in: ["HIGH", "CRITICAL"],
            },
          },
        },
      },
    }),
  ]);
  const suspiciousTransactionRate =
  totalTransactions > 0
    ? Number(
        ((suspiciousTransactionCount / totalTransactions) * 100).toFixed(2)
      )
    : 0;

const highRiskTransactionRate =
  totalTransactions > 0
    ? Number(
        ((highRiskTransactionCount / totalTransactions) * 100).toFixed(2)
      )
    : 0;

  return {
    totalTransactions,
    totalTransactionValueByCurrency: valueByCurrencyGroups.map((group) => ({
      currency: group.currency,
      totalValue: group._sum.amount?.toString() ?? "0",
      transactionCount: group._count._all,
    })),
    byType: normalizeCounts(
      TRANSACTION_TYPES,
      mapGroupedCounts(byTypeGroups, "type")
    ),
    byStatus: normalizeCounts(
      TRANSACTION_STATUSES,
      mapGroupedCounts(byStatusGroups, "status")
    ),
    suspiciousTransactionCount,
    highRiskTransactionCount,
    suspiciousTransactionRate,
    highRiskTransactionRate,
  };
};

export const getRecentActivity = async (includeAuditLogs: boolean) => {
  const [recentAMLAlerts, recentKYCChecks, recentComplianceCases, recentAuditLogs] =
    await Promise.all([
      prisma.aMLAlert.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          description: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              kycStatus: true,
            },
          },
          transaction: {
            select: {
              id: true,
              amount: true,
              currency: true,
              type: true,
              status: true,
              timestamp: true,
            },
          },
        },
      }),
      prisma.kYCCheck.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          checkType: true,
          status: true,
          score: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              kycStatus: true,
            },
          },
        },
      }),
      prisma.aMLCase.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          priority: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
          closedAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              kycStatus: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          alert: {
            select: {
              id: true,
              type: true,
              severity: true,
              status: true,
            },
          },
        },
      }),
      includeAuditLogs
        ? prisma.auditLog.findMany({
            take: 10,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              action: true,
              entity: true,
              entityId: true,
              details: true,
              ipAddress: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

  return {
    recentAMLAlerts,
    recentKYCChecks,
    recentComplianceCases,
    recentAuditLogs,
    auditLogsAvailable: includeAuditLogs,
  };
};

export const getDashboardSummary = async (includeAuditLogs: boolean) => {
  const [
    customerStatusCounts,
    risk,
    checkStatusCounts,
    amlGroupedCounts,
    cases,
    transactions,
    activity,
  ] = await Promise.all([
    getCustomerKYCStatusCounts(),
    getRiskStatistics(),
    getKYCCheckStatusCounts(),
    getAMLGroupedCounts(),
    getCaseStatistics(),
    getTransactionStatistics(),
    getRecentActivity(includeAuditLogs),
  ]);

  const totalCustomers = totalFromCounts(customerStatusCounts);
  const totalAMLAlerts = totalFromCounts(amlGroupedCounts.byStatus);

  return {
    generatedAt: new Date().toISOString(),
    compliance: {
      totalCustomers,
      pendingKYCCustomers: customerStatusCounts.PENDING,
      verifiedCustomers: customerStatusCounts.VERIFIED,
      rejectedCustomers: customerStatusCounts.REJECTED,
      totalAMLAlerts,
      openAMLAlerts: amlGroupedCounts.byStatus.OPEN,
      investigatingAMLAlerts: amlGroupedCounts.byStatus.INVESTIGATING,
      escalatedAMLAlerts: amlGroupedCounts.byStatus.ESCALATED,
      resolvedAMLAlerts: amlGroupedCounts.byStatus.RESOLVED,
      totalAMLCases: cases.totalCases,
      openCases: cases.openCases,
      investigatingCases: cases.investigatingCases,
      escalatedCases: cases.escalatedCases,
      resolvedCases: cases.resolvedCases,
    },
    risk,
    kyc: {
      customersByStatus: customerStatusCounts,
      pendingCustomers: customerStatusCounts.PENDING,
      verifiedCustomers: customerStatusCounts.VERIFIED,
      rejectedCustomers: customerStatusCounts.REJECTED,
      checksByStatus: checkStatusCounts,
      checksPassed: checkStatusCounts.PASSED,
      checksFailed: checkStatusCounts.FAILED,
    },
    aml: {
      totalAlerts: totalAMLAlerts,
      byType: amlGroupedCounts.byType,
      bySeverity: amlGroupedCounts.bySeverity,
      byStatus: amlGroupedCounts.byStatus,
      openAlerts: amlGroupedCounts.byStatus.OPEN,
      investigatingAlerts: amlGroupedCounts.byStatus.INVESTIGATING,
      escalatedAlerts: amlGroupedCounts.byStatus.ESCALATED,
      resolvedAlerts: amlGroupedCounts.byStatus.RESOLVED,
      falsePositiveAlerts: amlGroupedCounts.byStatus.FALSE_POSITIVE,
    },
    cases,
    transactions,
    activity,
  };
};

export const getAMLAlertTrends = async (days = 30) => {
  const startDate = new Date();

  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const alerts = await prisma.aMLAlert.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
      severity: true,
      type: true,
      status: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const trends: Record<
    string,
    {
      total: number;
      highRisk: number;
      critical: number;
      open: number;
    }
  > = {};

  for (const alert of alerts) {
    const date = alert.createdAt.toISOString().slice(0, 10);

    if (!trends[date]) {
      trends[date] = {
        total: 0,
        highRisk: 0,
        critical: 0,
        open: 0,
      };
    }

    trends[date].total += 1;

    if (alert.severity === "HIGH") {
      trends[date].highRisk += 1;
    }

    if (alert.severity === "CRITICAL") {
      trends[date].critical += 1;
    }

    if (alert.status === "OPEN") {
      trends[date].open += 1;
    }
  }

  return Object.entries(trends).map(([date, counts]) => ({
    date,
    ...counts,
  }));
};

export const getKYCAndRiskAnalytics = async () => {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      kycStatus: true,
      riskAssessments: {
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: 1,
        select: {
          level: true,
          score: true,
        },
      },
    },
  });

  const analytics = {
    totalCustomers: customers.length,
    verifiedHighRisk: 0,
    verifiedCriticalRisk: 0,
    pendingHighRisk: 0,
    pendingCriticalRisk: 0,
    rejectedHighRisk: 0,
    rejectedCriticalRisk: 0,
    customersWithoutRiskAssessment: 0,
  };

  for (const customer of customers) {
    const latestRisk = customer.riskAssessments[0];

    if (!latestRisk) {
      analytics.customersWithoutRiskAssessment += 1;
      continue;
    }

    if (
      customer.kycStatus === "VERIFIED" &&
      latestRisk.level === "HIGH"
    ) {
      analytics.verifiedHighRisk += 1;
    }

    if (
      customer.kycStatus === "VERIFIED" &&
      latestRisk.level === "CRITICAL"
    ) {
      analytics.verifiedCriticalRisk += 1;
    }

    if (
      customer.kycStatus === "PENDING" &&
      latestRisk.level === "HIGH"
    ) {
      analytics.pendingHighRisk += 1;
    }

    if (
      customer.kycStatus === "PENDING" &&
      latestRisk.level === "CRITICAL"
    ) {
      analytics.pendingCriticalRisk += 1;
    }

    if (
      customer.kycStatus === "REJECTED" &&
      latestRisk.level === "HIGH"
    ) {
      analytics.rejectedHighRisk += 1;
    }

    if (
      customer.kycStatus === "REJECTED" &&
      latestRisk.level === "CRITICAL"
    ) {
      analytics.rejectedCriticalRisk += 1;
    }
  }

  return analytics;
};

export const getHighRiskCustomers = async () => {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      kycStatus: true,
      riskAssessments: {
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: 1,
        select: {
          score: true,
          level: true,
          reasons: true,
          createdAt: true,
        },
      },
      amlAlerts: {
        where: {
          status: {
            in: ["OPEN", "INVESTIGATING", "ESCALATED"],
          },
        },
        select: {
          id: true,
          severity: true,
          status: true,
          type: true,
        },
      },
    },
  });

  return customers
    .filter((customer) => {
      const risk = customer.riskAssessments[0];

      return (
        risk &&
        ["HIGH", "CRITICAL"].includes(risk.level)
      );
    })
    .map((customer) => {
      const risk = customer.riskAssessments[0];

      return {
        customerId: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        kycStatus: customer.kycStatus,
        riskLevel: risk?.level,
        riskScore: risk?.score,
        riskReasons: risk?.reasons,
        riskAssessmentDate: risk?.createdAt,
        activeAlertCount: customer.amlAlerts.length,
        criticalAlertCount: customer.amlAlerts.filter(
          (alert) => alert.severity === "CRITICAL"
        ).length,
      };
    })
    .sort((a, b) => {
      if (a.riskLevel === "CRITICAL" && b.riskLevel !== "CRITICAL") {
        return -1;
      }

      if (a.riskLevel !== "CRITICAL" && b.riskLevel === "CRITICAL") {
        return 1;
      }

      return (b.riskScore ?? 0) - (a.riskScore ?? 0);
    });
};

export const getRepeatAMLAlertCustomers = async () => {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      amlAlerts: {
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return customers
    .filter((customer) => customer.amlAlerts.length >= 2)
    .map((customer) => {
      const alerts = customer.amlAlerts;

      const alertTypes = [...new Set(
        alerts.map((alert) => alert.type)
      )];

      const criticalAlerts = alerts.filter(
        (alert) => alert.severity === "CRITICAL"
      ).length;

      const highAlerts = alerts.filter(
        (alert) => alert.severity === "HIGH"
      ).length;

      const unresolvedAlerts = alerts.filter(
        (alert) =>
          ["OPEN", "INVESTIGATING", "ESCALATED"].includes(
            alert.status
          )
      ).length;

      return {
        customerId: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        totalAlerts: alerts.length,
        criticalAlerts,
        highAlerts,
        unresolvedAlerts,
        alertTypes,
        latestAlertAt: alerts[0]?.createdAt ?? null,
      };
    })
    .sort((a, b) => {
      if (b.criticalAlerts !== a.criticalAlerts) {
        return b.criticalAlerts - a.criticalAlerts;
      }

      return b.totalAlerts - a.totalAlerts;
    });
};

export const getSuspiciousPatterns = async () => {
  const alerts = await prisma.aMLAlert.findMany({
    select: {
      type: true,
      severity: true,
      status: true,
      customerId: true,
      createdAt: true,
    },
  });

  const patternMap = new Map<
    string,
    {
      alertCount: number;
      customerIds: Set<string>;
      criticalCount: number;
      unresolvedCount: number;
    }
  >();

  for (const alert of alerts) {
    if (!patternMap.has(alert.type)) {
      patternMap.set(alert.type, {
        alertCount: 0,
        customerIds: new Set<string>(),
        criticalCount: 0,
        unresolvedCount: 0,
      });
    }

    const pattern = patternMap.get(alert.type)!;

    pattern.alertCount += 1;
    pattern.customerIds.add(alert.customerId);

    if (alert.severity === "CRITICAL") {
      pattern.criticalCount += 1;
    }

    if (
      ["OPEN", "INVESTIGATING", "ESCALATED"].includes(
        alert.status
      )
    ) {
      pattern.unresolvedCount += 1;
    }
  }

  return Array.from(patternMap.entries())
    .map(([type, data]) => ({
      type,
      alertCount: data.alertCount,
      affectedCustomers: data.customerIds.size,
      criticalCount: data.criticalCount,
      unresolvedCount: data.unresolvedCount,
    }))
    .sort((a, b) => b.alertCount - a.alertCount);
};

export const getComplianceOfficerWorkload = async () => {
  const officers = await prisma.user.findMany({
    where: {
      role: "COMPLIANCE_OFFICER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      assignedCases: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return officers
    .map((officer) => {
      const cases = officer.assignedCases as Array<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }>;

      const activeCases = cases.filter((amlCase) =>
        ["OPEN", "INVESTIGATING", "ESCALATED"].includes(
          amlCase.status
        )
      );

      const escalatedCases = cases.filter(
        (amlCase) => amlCase.status === "ESCALATED"
      );

      const resolvedCases = cases.filter(
        (amlCase) =>
          ["RESOLVED", "FALSE_POSITIVE", "CLOSED"].includes(
            amlCase.status
          )
      );

      return {
        officerId: officer.id,
        officerName: officer.name,
        officerEmail: officer.email,
        totalCases: cases.length,
        activeCases: activeCases.length,
        escalatedCases: escalatedCases.length,
        resolvedCases: resolvedCases.length,
      };
    })
    .sort((a, b) => b.activeCases - a.activeCases);
};

export const getRiskIntelligence = async () => {
  const [
    highRiskCustomers,
    repeatAMLAlertCustomers,
    suspiciousPatterns,
    complianceOfficerWorkload,
  ] = await Promise.all([
    getHighRiskCustomers(),
    getRepeatAMLAlertCustomers(),
    getSuspiciousPatterns(),
    getComplianceOfficerWorkload(),
  ]);

  return {
    highRiskCustomers,
    repeatAMLAlertCustomers,
    suspiciousPatterns,
    complianceOfficerWorkload,
  };
};