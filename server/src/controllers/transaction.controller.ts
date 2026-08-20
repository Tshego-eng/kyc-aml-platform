import { Request, Response } from "express";

import {
  createTransaction,
  createAMLAlerts,
} from "../services/aml.service";

export const createTransactionController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      customerId,
      amount,
      currency,
      country,
      type,
    } = req.body;

    if (
      !customerId ||
      amount === undefined ||
      !country ||
      !type
    ) {
      return res.status(400).json({
        error:
          "customerId, amount, country and type are required",
      });
    }

    const transaction =
      await createTransaction({
        customerId,
        amount: Number(amount),
        currency,
        country,
        type,
      });

    const alerts = await createAMLAlerts(
      transaction.id
    );

    return res.status(201).json({
      message:
        "Transaction created successfully",
      transaction,
      alerts,
    });
  } catch (error) {
    console.error(
      "Transaction creation error:",
      error
    );

    if (
      error instanceof Error &&
      error.message ===
        "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(500).json({
      error:
        "Failed to create transaction",
    });
  }
};