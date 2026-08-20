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
