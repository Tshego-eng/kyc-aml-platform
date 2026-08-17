import prisma from "../lib/prisma";

interface CreateCustomerData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  idNumber: string;
  country: string;
  address?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  annualIncome?: number;
  sourceOfFunds?: string;
}

export const createCustomer = async (
  data: CreateCustomerData
) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      idNumber: data.idNumber,
    },
  });

  if (existingCustomer) {
    throw new Error("ID_NUMBER_ALREADY_EXISTS");
  }

  const customer = await prisma.customer.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      idNumber: data.idNumber,
      country: data.country,
      address: data.address,
      phone: data.phone,
      email: data.email,
      occupation: data.occupation,
      annualIncome: data.annualIncome,
      sourceOfFunds: data.sourceOfFunds,
    },
  });

  return customer;
};

export const getCustomers = async () => {
  return prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      idNumber: true,
      country: true,
      address: true,
      phone: true,
      email: true,
      occupation: true,
      annualIncome: true,
      sourceOfFunds: true,
      kycStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const getCustomerById = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id,
    },
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
      amlAlerts: {
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

interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  annualIncome?: number;
  sourceOfFunds?: string;
}

export const updateCustomer = async (
  id: string,
  data: UpdateCustomerData
) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      id,
    },
  });

  if (!existingCustomer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const customer = await prisma.customer.update({
    where: {
      id,
    },
    data: {
      ...(data.firstName !== undefined && {
        firstName: data.firstName,
      }),

      ...(data.lastName !== undefined && {
        lastName: data.lastName,
      }),

      ...(data.dateOfBirth !== undefined && {
        dateOfBirth: new Date(data.dateOfBirth),
      }),

      ...(data.country !== undefined && {
        country: data.country,
      }),

      ...(data.address !== undefined && {
        address: data.address,
      }),

      ...(data.phone !== undefined && {
        phone: data.phone,
      }),

      ...(data.email !== undefined && {
        email: data.email,
      }),

      ...(data.occupation !== undefined && {
        occupation: data.occupation,
      }),

      ...(data.annualIncome !== undefined && {
        annualIncome: data.annualIncome,
      }),

      ...(data.sourceOfFunds !== undefined && {
        sourceOfFunds: data.sourceOfFunds,
      }),
    },
  });

  return customer;
};