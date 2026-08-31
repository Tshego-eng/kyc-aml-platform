import prisma from "../lib/prisma";
import { CaseStatus } from "@prisma/client";

export const createAMLCase = async (
  alertId: string
) => {
  const alert = await prisma.aMLAlert.findUnique({
    where: {
      id: alertId,
    },
  });

  if (!alert) {
    throw new Error("ALERT_NOT_FOUND");
  }

  const existingCase =
    await prisma.aMLCase.findUnique({
      where: {
        alertId,
      },
    });

  if (existingCase) {
    throw new Error("CASE_ALREADY_EXISTS");
  }

  const amlCase = await prisma.aMLCase.create({
    data: {
      alertId: alert.id,
      customerId: alert.customerId,
      priority: alert.severity,
    },
    include: {
      alert: true,
      customer: true,
    },
  });

  return amlCase;
};

export const getAMLCaseList = async (
  status?: string
) => {
  const cases = await prisma.aMLCase.findMany({
    where: status
      ? {
          status: status as any,
        }
      : undefined,

    include: {
      alert: true,

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
          email: true,
          role: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return cases;
};

export const getAMLCaseById = async (
  caseId: string
) => {
  const amlCase =
    await prisma.aMLCase.findUnique({
      where: {
        id: caseId,
      },

      include: {
        alert: true,
        customer: {
  include: {
    kycChecks: {
      orderBy: {
        createdAt: "desc",
      },
    },

    riskAssessments: {
      orderBy: {
        createdAt: "desc",
      },
    },

    transactions: {
      orderBy: {
        timestamp: "desc",
      },
    },
  },
},

        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        notes: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },

        evidence: true,
      },
    });

  if (!amlCase) {
    throw new Error("CASE_NOT_FOUND");
  }

  return amlCase;
};

export const assignAMLCase = async (
  caseId: string,
  reviewerId: string
) => {
  const amlCase =
    await prisma.aMLCase.findUnique({
      where: {
        id: caseId,
      },
    });

  if (!amlCase) {
    throw new Error("CASE_NOT_FOUND");
  }

  const reviewer =
    await prisma.user.findUnique({
      where: {
        id: reviewerId,
      },
    });

  if (!reviewer) {
    throw new Error("REVIEWER_NOT_FOUND");
  }

  if (
    reviewer.role !== "COMPLIANCE_OFFICER" &&
    reviewer.role !== "ADMIN"
  ) {
    throw new Error(
      "INVALID_REVIEWER_ROLE"
    );
  }

  return prisma.aMLCase.update({
    where: {
      id: caseId,
    },

    data: {
      assignedToId: reviewerId,
      status: "INVESTIGATING",
    },

    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
};

export const addInvestigationNote = async (
  caseId: string,
  authorId: string,
  note: string
) => {
  const amlCase =
    await prisma.aMLCase.findUnique({
      where: {
        id: caseId,
      },
    });

  if (!amlCase) {
    throw new Error("CASE_NOT_FOUND");
  }

  if (!note.trim()) {
    throw new Error("NOTE_REQUIRED");
  }

  return prisma.investigationNote.create({
    data: {
      caseId,
      authorId,
      note: note.trim(),
    },

    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const addCaseEvidence = async (
  caseId: string,
  uploadedBy: string,
  fileName: string,
  fileType?: string,
  description?: string
) => {
  const amlCase = await prisma.aMLCase.findUnique({
    where: {
      id: caseId,
    },
  });

  if (!amlCase) {
    throw new Error("CASE_NOT_FOUND");
  }

  if (!fileName.trim()) {
    throw new Error("FILE_NAME_REQUIRED");
  }

  return prisma.caseEvidence.create({
    data: {
      caseId,
      uploadedBy,
      fileName: fileName.trim(),
      ...(fileType !== undefined && { fileType: fileType.trim() }),
      ...(description !== undefined && {
        description: description.trim(),
      }),
    },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export async function getCaseById(caseId: string) {
  const complianceCase = await prisma.aMLCase.findUnique({
    where: {
      id: caseId,
    },
    include: {
      customer: true,
      alert: true,
    },
  });

  if (!complianceCase) {
    throw new Error("CASE_NOT_FOUND");
  }

  return complianceCase;
}

const allowedTransitions: Record<CaseStatus, CaseStatus[]> = {
  OPEN: [
    CaseStatus.INVESTIGATING,
    CaseStatus.FALSE_POSITIVE,
  ],
  INVESTIGATING: [
    CaseStatus.ESCALATED,
    CaseStatus.RESOLVED,
    CaseStatus.FALSE_POSITIVE,
  ],
  ESCALATED: [
    CaseStatus.INVESTIGATING,
    CaseStatus.RESOLVED,
    CaseStatus.FALSE_POSITIVE,
    CaseStatus.ESCALATED,
  ],
  RESOLVED: [CaseStatus.FALSE_POSITIVE],
  CLOSED: [],
  FALSE_POSITIVE: [CaseStatus.ESCALATED],
};


export const updateAMLCaseStatus = async (
  caseId: string,
  newStatus: CaseStatus,
  resolution?: string
) => {
  const amlCase = await prisma.aMLCase.findUnique({
    where: {
      id: caseId,
    },
  });

  if (!amlCase) {
    throw new Error("CASE_NOT_FOUND");
  }

  const requiresResolution: CaseStatus[] = [
    CaseStatus.FALSE_POSITIVE,
    CaseStatus.RESOLVED,
    CaseStatus.ESCALATED,
  ];

  

  if (
    requiresResolution.includes(newStatus) &&
    !resolution?.trim()
  ) {
    throw new Error("RESOLUTION_REQUIRED");
  }

  if (
    !allowedTransitions[amlCase.status]?.includes(
      newStatus
    ) &&
    amlCase.status !== newStatus
  ) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }

  return prisma.aMLCase.update({
    where: {
      id: caseId,
    },
    data: {
      status: newStatus,
      ...(resolution !== undefined && { resolution }),
      ...(["RESOLVED", "CLOSED"].includes(newStatus) && {
        closedAt: new Date(),
      }),
    },
  });
};