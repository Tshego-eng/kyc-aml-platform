import prisma from "../lib/prisma";

type ReviewDecision =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_REVIEW";

interface CreateKYCReviewData {
  customerId: string;
  reviewerId: string;
  decision: ReviewDecision;
  reason: string;
}

export const createKYCReview = async (
  data: CreateKYCReviewData
) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: data.customerId,
    },
    include: {
      kycChecks: true,
    },
  });
  

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  if (!data.reason || data.reason.trim().length < 5) {
    throw new Error("REASON_REQUIRED");
  }

    const latestReview = await prisma.kYCReview.findFirst({
  where: {
    customerId: data.customerId,
  },
  orderBy: {
    createdAt: "desc",
  },
});

if (
  latestReview &&
  latestReview.decision === data.decision &&
  data.decision !== "REQUEST_REVIEW"
) {
  throw new Error("DUPLICATE_REVIEW");
}

  const review = await prisma.kYCReview.create({
    data: {
      customerId: data.customerId,
      reviewerId: data.reviewerId,
      decision: data.decision,
      reason: data.reason.trim(),
    },
  });


  let kycStatus = customer.kycStatus;

  if (data.decision === "APPROVE") {
    kycStatus = "VERIFIED";
  }

  if (data.decision === "REJECT") {
    kycStatus = "REJECTED";
  }

  if (data.decision === "REQUEST_REVIEW") {
    kycStatus = "PENDING";
  }

  await prisma.customer.update({
    where: {
      id: data.customerId,
    },
    data: {
      kycStatus,
    },
  });

  return {
    review,
    kycStatus,
  };
};

export const getKYCReviewHistory = async (
  customerId: string
) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const reviews = await prisma.kYCReview.findMany({
    where: {
      customerId,
    },
    include: {
      reviewer: {
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

  return reviews;
};

export const getKYCOverview = async (
  customerId: string
) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    include: {
      kycChecks: {
        orderBy: {
          createdAt: "desc",
        },
      },
      kycReviews: {
        include: {
          reviewer: {
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
      },
      riskAssessments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  return customer;
};