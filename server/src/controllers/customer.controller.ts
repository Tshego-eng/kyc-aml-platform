import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/audit.service";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
} from "../services/customer.service";

export const createCustomerController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const customer = await createCustomer(req.body);

    await createAuditLog({
  userId: req.user!.userId,
  action: "CUSTOMER_CREATED",
  entity: "Customer",
  entityId: customer.id,
  details: {
    customerId: customer.id,
    country: customer.country,
  },
  ipAddress: req.ip,
});

    return res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    console.error("Customer creation error:", error);

    if (
      error instanceof Error &&
      error.message === "ID_NUMBER_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        error: "A customer with this ID number already exists",
      });
    }

    return res.status(500).json({
      error: "Failed to create customer",
    });
  }
};

export const getCustomersController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const customers = await getCustomers();

    await createAuditLog({
      userId: req.user!.userId,
      action: "CUSTOMERS_VIEWED",
      entity: "Customer",
      details: {
        count: customers.length,
      },
      ipAddress: req.ip,
    });

    return res.json({
      customers,
    });
  } catch (error) {
    console.error("Customer retrieval error:", error);

    return res.status(500).json({
      error: "Failed to retrieve customers",
    });
  }
};

export const getCustomerController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const customer = await getCustomerById(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    );

    await createAuditLog({
      userId: req.user!.userId,
      action: "CUSTOMER_VIEWED",
      entity: "Customer",
      entityId: customer.id,
      details: {
        customerId: customer.id,
      },
      ipAddress: req.ip,
    });

    return res.json({
      customer,
    });
  } catch (error) {
    console.error("Customer retrieval error:", error);

    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(500).json({
      error: "Failed to retrieve customer",
    });
  }
};

export const updateCustomerController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const customer = await updateCustomer(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      req.body
    );

    await createAuditLog({
      userId: req.user!.userId,
      action: "CUSTOMER_UPDATED",
      entity: "Customer",
      entityId: customer.id,
      details: {
        customerId: customer.id,
      },
      ipAddress: req.ip,
    });

    return res.json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    console.error("Customer update error:", error);

    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(500).json({
      error: "Failed to update customer",
    });
  }
};