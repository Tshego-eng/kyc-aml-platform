import prisma from "../lib/prisma";

interface PerformKYCCheckData {
  customerId: string;
  checkType:
    | "IDENTITY"
    | "ADDRESS"
    | "DATE_OF_BIRTH"
    | "EMAIL"
    | "PHONE";
}

export const performKYCCheck = async (
  data: PerformKYCCheckData
) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: data.customerId,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  let status: "PASSED" | "FAILED" = "FAILED";
  let score = 0;
  let notes = "";

  switch (data.checkType) {
    case "IDENTITY":
      /*
       * Simulated identity verification.
       *
       * In a real system this would connect to an
       * identity verification provider.
       */
      if (customer.idNumber.length >= 13) {
        status = "PASSED";
        score = 100;
        notes = "Identity information passed simulated verification.";
      } else {
        status = "FAILED";
        score = 0;
        notes = "Identity information failed verification.";
      }
      break;

    case "ADDRESS":
      if (customer.address) {
        status = "PASSED";
        score = 100;
        notes = "Customer address is present.";
      } else {
        status = "FAILED";
        score = 0;
        notes = "Customer address is missing.";
      }
      break;

    case "DATE_OF_BIRTH":
      if (customer.dateOfBirth) {
        status = "PASSED";
        score = 100;
        notes = "Date of birth is present.";
      } else {
        status = "FAILED";
        score = 0;
        notes = "Date of birth is missing.";
      }
      break;

    case "EMAIL":
      if (customer.email) {
        status = "PASSED";
        score = 100;
        notes = "Customer email address is present.";
      } else {
        status = "FAILED";
        score = 0;
        notes = "Customer email address is missing.";
      }
      break;

    case "PHONE":
      if (customer.phone) {
        status = "PASSED";
        score = 100;
        notes = "Customer phone number is present.";
      } else {
        status = "FAILED";
        score = 0;
        notes = "Customer phone number is missing.";
      }
      break;

    default:
      throw new Error("INVALID_KYC_CHECK_TYPE");
  }

  const kycCheck = await prisma.kYCCheck.create({
    data: {
      customerId: customer.id,
      checkType: data.checkType,
      status,
      score,
      notes,
    },
  });

  return kycCheck;
};

export const evaluateKYCStatus = async (
  customerId: string
) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    include: {
      kycChecks: true,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const requiredChecks = [
    "IDENTITY",
    "ADDRESS",
    "DATE_OF_BIRTH",
    "EMAIL",
    "PHONE",
  ];

  const completedChecks = customer.kycChecks;

  const allChecksCompleted = requiredChecks.every((checkType) =>
    completedChecks.some(
      (check) => check.checkType === checkType
    )
  );

  if (!allChecksCompleted) {
    await prisma.customer.update({
      where: {
        id: customerId,
      },
      data: {
        kycStatus: "PENDING",
      },
    });

    return {
      status: "PENDING",
      reason: "Not all required KYC checks have been completed.",
    };
  }

  const hasFailedCheck = requiredChecks.some((checkType) =>
    completedChecks.some(
      (check) =>
        check.checkType === checkType &&
        check.status === "FAILED"
    )
  );

  const newStatus = hasFailedCheck
    ? "REJECTED"
    : "VERIFIED";

  await prisma.customer.update({
    where: {
      id: customerId,
    },
    data: {
      kycStatus: newStatus,
    },
  });

  return {
    status: newStatus,
    reason: hasFailedCheck
      ? "One or more KYC checks failed."
      : "All required KYC checks passed.",
  };
};