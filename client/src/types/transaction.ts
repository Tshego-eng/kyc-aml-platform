import type { AlertType, AlertStatus, RiskLevel, TransactionType } from "./dashboard";

export type { TransactionType };

// POST /api/customers/:id/transactions request body
// (server/src/controllers/transaction.controller.ts). currency is
// optional — the backend defaults it to "ZAR" if omitted
// (server/src/services/aml.service.ts `createTransaction`).
export interface CreateTransactionInput {
  amount: number;
  currency?: string;
  country: string;
  type: TransactionType;
}

// The raw Transaction row returned in the response (no relations).
export interface CreatedTransaction {
  id: string;
  customerId: string;
  amount: string;
  currency: string;
  country: string;
  type: TransactionType;
  status: string;
  timestamp: string;
}

// The raw AMLAlert row(s) returned alongside the transaction — created
// by the backend's existing analyzeTransaction()/createAMLAlerts()
// pipeline, not by the frontend. Can be an empty array when no rule
// triggered.
export interface CreatedAMLAlert {
  id: string;
  customerId: string;
  transactionId: string;
  type: AlertType;
  severity: RiskLevel;
  status: AlertStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Matches the literal response of createTransactionController exactly.
export interface CreateTransactionResponse {
  message: string;
  transaction: CreatedTransaction;
  alerts: CreatedAMLAlert[];
}
