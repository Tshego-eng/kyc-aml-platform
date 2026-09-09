import { httpClient } from "./httpClient";
import type {
  CreateTransactionInput,
  CreateTransactionResponse,
} from "../types/transaction";

// POST /api/customers/:id/transactions — creates the transaction, then
// runs the backend's existing AML detection pipeline
// (analyzeTransaction -> createAMLAlerts) before responding. The
// frontend never evaluates AML rules itself; it only sends the input
// and displays whatever `alerts` the backend actually created.
export function simulateTransaction(
  customerId: string,
  input: CreateTransactionInput
): Promise<CreateTransactionResponse> {
  return httpClient.post<CreateTransactionResponse>(
    `/customers/${customerId}/transactions`,
    input
  );
}
