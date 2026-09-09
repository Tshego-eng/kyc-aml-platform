import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { simulateTransaction } from "../../services/transaction.service";
import { ApiError } from "../../types/api";
import type {
  CreateTransactionResponse,
  TransactionType,
} from "../../types/transaction";
import StatusBadge from "../StatusBadge";
import {
  formatCurrencyAmount,
  formatDateTime,
  humanizeLabel,
  riskLevelTone,
} from "../../utils/format";

const TRANSACTION_TYPES: TransactionType[] = [
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER",
  "PAYMENT",
];

interface TransactionSimulationFormProps {
  customerId: string;
  onCreated: (result: CreateTransactionResponse) => void;
}

/**
 * Sends the input straight to POST /api/customers/:id/transactions and
 * displays whatever the backend's existing AML detection pipeline
 * actually returns. No AML rules are evaluated here — the "may trigger
 * a large-transaction alert" hint below states the backend's documented
 * *default* threshold (server/src/services/aml.service.ts,
 * AML_LARGE_TRANSACTION_THRESHOLD, default 100000) but the real
 * deployment may have overridden it via environment variable, so it's
 * phrased as a hint, not a guarantee.
 */
function TransactionSimulationForm({
  customerId,
  onCreated,
}: TransactionSimulationFormProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState<TransactionType>("DEPOSIT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateTransactionResponse | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (!country.trim()) {
      setError("Country is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await simulateTransaction(customerId, {
        amount: numericAmount,
        country: country.trim(),
        type,
        ...(currency.trim() ? { currency: currency.trim().toUpperCase() } : {}),
      });
      setResult(res);
      onCreated(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to simulate this transaction."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="simulation-result">
        <p className="simulation-result__heading">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          Transaction simulated successfully
        </p>
        <dl className="profile-panel__list">
          <div className="profile-panel__row">
            <dt>Amount</dt>
            <dd>
              {formatCurrencyAmount(
                result.transaction.amount,
                result.transaction.currency
              )}
            </dd>
          </div>
          <div className="profile-panel__row">
            <dt>Type</dt>
            <dd>{humanizeLabel(result.transaction.type)}</dd>
          </div>
          <div className="profile-panel__row">
            <dt>Country</dt>
            <dd>{result.transaction.country}</dd>
          </div>
          <div className="profile-panel__row">
            <dt>Timestamp</dt>
            <dd>{formatDateTime(result.transaction.timestamp)}</dd>
          </div>
        </dl>

        <div className="simulation-result__aml">
          {result.alerts.length === 0 ? (
            <p className="profile-panel__note">
              No AML monitoring rule was triggered by this transaction.
            </p>
          ) : (
            <>
              <p className="simulation-result__alert-heading">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                AML alert{result.alerts.length > 1 ? "s" : ""} generated
              </p>
              <ul className="review-list">
                {result.alerts.map((alert) => (
                  <li key={alert.id} className="review-list__item">
                    <div className="review-list__header">
                      <StatusBadge
                        label={humanizeLabel(alert.severity)}
                        tone={riskLevelTone(alert.severity)}
                      />
                      <span className="review-list__reviewer">
                        {humanizeLabel(alert.type)}
                      </span>
                    </div>
                    <p className="review-list__reason">{alert.description}</p>
                    <Link to={`/aml-alerts/${alert.id}`}>View AML Alert →</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className="review-form review-form--wide" onSubmit={handleSubmit}>
      <p className="simulation-notice">
        <i className="bi bi-info-circle" aria-hidden="true" />
        Test transaction for this simulation platform — no real funds are
        transferred. Amounts above the backend's configured large-transaction
        threshold (100,000 by default) may trigger an AML alert.
      </p>

      <label className="review-form__field">
        <span>Amount</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="e.g. 150000"
        />
      </label>

      <label className="review-form__field">
        <span>Currency (optional — defaults to ZAR)</span>
        <input
          type="text"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          placeholder="ZAR"
          maxLength={8}
        />
      </label>

      <label className="review-form__field">
        <span>Country</span>
        <input
          type="text"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          placeholder="e.g. South Africa"
        />
      </label>

      <label className="review-form__field">
        <span>Transaction type</span>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as TransactionType)}
        >
          {TRANSACTION_TYPES.map((option) => (
            <option key={option} value={option}>
              {humanizeLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="review-form__submit"
        disabled={submitting}
      >
        {submitting ? "Simulating…" : "Simulate transaction"}
      </button>
      {error && <p className="profile-panel__error">{error}</p>}
    </form>
  );
}

export default TransactionSimulationForm;
