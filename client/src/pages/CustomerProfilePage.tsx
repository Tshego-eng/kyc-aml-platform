import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getCustomerKycOverview,
  performKycCheck,
  evaluateKycStatus,
  createKycReview,
} from "../services/customer.service";
import { ApiError } from "../types/api";
import type { KYCOverviewCustomer, ReviewDecision } from "../types/customer";
import type { KycCheckType } from "../types/dashboard";
import { useRole } from "../hooks/useRole";
import StatusBadge from "../components/StatusBadge";
import {
  formatDateTime,
  humanizeLabel,
  kycStatusTone,
  checkStatusTone,
  riskLevelTone,
  reviewDecisionTone,
} from "../utils/format";

type ProfileState =
  | { phase: "loading" }
  | { phase: "not-found" }
  | { phase: "error"; message: string }
  | { phase: "ready"; customer: KYCOverviewCustomer };

const CHECK_TYPES: KycCheckType[] = [
  "IDENTITY",
  "ADDRESS",
  "DATE_OF_BIRTH",
  "EMAIL",
  "PHONE",
];
const REVIEW_DECISIONS: ReviewDecision[] = ["APPROVE", "REJECT", "REQUEST_REVIEW"];

async function fetchProfileState(customerId: string): Promise<ProfileState> {
  try {
    const res = await getCustomerKycOverview(customerId);
    return { phase: "ready", customer: res.customer };
  } catch (error) {
    if (error instanceof ApiError && error.kind === "not_found") {
      return { phase: "not-found" };
    }
    const message =
      error instanceof ApiError ? error.message : "Unable to load this customer.";
    return { phase: "error", message };
  }
}

/**
 * Customer profile. Uses GET /api/customers/:id/kyc-overview as the
 * single aggregated source for customer info, KYC checks, KYC review
 * history, and risk assessments — exactly what this step needs, with
 * no separate calls per section.
 */
function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { hasAnyRole } = useRole();
  const [state, setState] = useState<ProfileState>(() =>
    id ? { phase: "loading" } : { phase: "not-found" }
  );

  const [checkType, setCheckType] = useState<KycCheckType>("IDENTITY");
  const [checkSubmitting, setCheckSubmitting] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [evaluating, setEvaluating] = useState(false);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [evaluateResult, setEvaluateResult] = useState<string | null>(null);

  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>("APPROVE");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    fetchProfileState(id).then(setState);
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    fetchProfileState(id).then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER", "ANALYST") on
  // POST .../kyc-checks and .../kyc-status/evaluate.
  const canPerformKyc = hasAnyRole(["ADMIN", "COMPLIANCE_OFFICER", "ANALYST"]);
  // Mirrors authorize("ADMIN", "COMPLIANCE_OFFICER") on POST .../kyc-review.
  const canReview = hasAnyRole(["ADMIN", "COMPLIANCE_OFFICER"]);

  const handlePerformCheck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    setCheckError(null);
    setCheckSubmitting(true);
    try {
      await performKycCheck(id, checkType);
      reload();
    } catch (error) {
      setCheckError(
        error instanceof ApiError ? error.message : "Unable to run this check."
      );
    } finally {
      setCheckSubmitting(false);
    }
  };

  const handleEvaluate = async () => {
    if (!id) return;
    setEvaluateError(null);
    setEvaluateResult(null);
    setEvaluating(true);
    try {
      const result = await evaluateKycStatus(id);
      setEvaluateResult(`${humanizeLabel(result.status)} — ${result.reason}`);
      reload();
    } catch (error) {
      setEvaluateError(
        error instanceof ApiError
          ? error.message
          : "Unable to evaluate KYC status."
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    setReviewError(null);

    if (reviewReason.trim().length < 5) {
      setReviewError("Reason must be at least 5 characters.");
      return;
    }

    setReviewSubmitting(true);
    try {
      await createKycReview(id, reviewDecision, reviewReason.trim());
      setReviewReason("");
      reload();
    } catch (error) {
      setReviewError(
        error instanceof ApiError ? error.message : "Unable to submit this review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (state.phase === "loading") {
    return (
      <section className="customer-profile" aria-busy="true">
        <p className="customer-profile__loading">Loading customer…</p>
      </section>
    );
  }

  if (state.phase === "not-found") {
    return (
      <section className="customer-profile">
        <h1 className="dashboard__heading">Customer not found</h1>
        <p className="customer-profile__not-found-body">
          This customer doesn&apos;t exist or may have been removed.
        </p>
        <Link to="/customers" className="access-denied__link">
          Return to Customers
        </Link>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="customer-profile">
        <h1 className="dashboard__heading">Customer</h1>
        <div className="dashboard-error">
          <p className="dashboard-error__body">
            Unable to load this customer — {state.message}
          </p>
          <button type="button" className="dashboard-error__retry" onClick={reload}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  const { customer } = state;

  return (
    <section className="customer-profile">
      <div className="customer-profile__header">
        <div>
          <Link to="/customers" className="customer-profile__back">
            ← Customers
          </Link>
          <h1 className="customer-profile__heading">
            {customer.firstName} {customer.lastName}
          </h1>
        </div>
        <StatusBadge
          label={humanizeLabel(customer.kycStatus)}
          tone={kycStatusTone(customer.kycStatus)}
        />
      </div>

      <div className="customer-profile__grid">
        <div className="profile-panel">
          <h2 className="profile-panel__title">Customer information</h2>
          <dl className="profile-panel__list">
            <div className="profile-panel__row">
              <dt>Email</dt>
              <dd>{customer.email ?? "—"}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Phone</dt>
              <dd>{customer.phone ?? "—"}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>ID number</dt>
              <dd>{customer.idNumber}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Date of birth</dt>
              <dd>{formatDateTime(customer.dateOfBirth)}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Country</dt>
              <dd>{customer.country}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Address</dt>
              <dd>{customer.address ?? "—"}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Occupation</dt>
              <dd>{customer.occupation ?? "—"}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Annual income</dt>
              <dd>{customer.annualIncome ?? "—"}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Source of funds</dt>
              <dd>{customer.sourceOfFunds ?? "—"}</dd>
            </div>
            <div className="profile-panel__row">
              <dt>Customer since</dt>
              <dd>{formatDateTime(customer.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="profile-panel">
          <h2 className="profile-panel__title">Risk assessments</h2>
          {customer.riskAssessments.length === 0 ? (
            <p className="profile-panel__empty">No risk assessments recorded.</p>
          ) : (
            <ul className="risk-list">
              {customer.riskAssessments.map((assessment) => (
                <li key={assessment.id} className="risk-list__item">
                  <div className="risk-list__header">
                    <StatusBadge
                      label={humanizeLabel(assessment.level)}
                      tone={riskLevelTone(assessment.level)}
                    />
                    <span className="risk-list__score">
                      Score {assessment.score}
                    </span>
                  </div>
                  {Array.isArray(assessment.reasons) &&
                    assessment.reasons.length > 0 && (
                      <ul className="risk-list__reasons">
                        {assessment.reasons.map((reason, index) => (
                          <li key={index}>{String(reason)}</li>
                        ))}
                      </ul>
                    )}
                  <span className="risk-list__date">
                    {formatDateTime(assessment.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="profile-panel">
        <div className="profile-panel__header-row">
          <h2 className="profile-panel__title">KYC checks</h2>
          {canPerformKyc && (
            <button
              type="button"
              className="profile-panel__action"
              onClick={handleEvaluate}
              disabled={evaluating}
            >
              {evaluating ? "Evaluating…" : "Evaluate KYC status"}
            </button>
          )}
        </div>

        {evaluateResult && (
          <p className="profile-panel__note">{evaluateResult}</p>
        )}
        {evaluateError && (
          <p className="profile-panel__error">{evaluateError}</p>
        )}

        {customer.kycChecks.length === 0 ? (
          <p className="profile-panel__empty">No KYC checks recorded yet.</p>
        ) : (
          <ul className="check-list">
            {customer.kycChecks.map((check) => (
              <li key={check.id} className="check-list__item">
                <div className="check-list__main">
                  <span className="check-list__type">
                    {humanizeLabel(check.checkType)}
                  </span>
                  {check.notes && (
                    <span className="check-list__notes">{check.notes}</span>
                  )}
                </div>
                <div className="check-list__side">
                  <StatusBadge
                    label={humanizeLabel(check.status)}
                    tone={checkStatusTone(check.status)}
                  />
                  {check.score !== null && (
                    <span className="check-list__score">
                      Score {check.score}
                    </span>
                  )}
                  <span className="check-list__date">
                    {formatDateTime(check.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {canPerformKyc && (
          <form className="check-form" onSubmit={handlePerformCheck}>
            <label className="check-form__field">
              <span>Run a KYC check</span>
              <select
                value={checkType}
                onChange={(event) =>
                  setCheckType(event.target.value as KycCheckType)
                }
              >
                {CHECK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanizeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="check-form__submit"
              disabled={checkSubmitting}
            >
              {checkSubmitting ? "Running…" : "Run check"}
            </button>
            {checkError && (
              <p className="profile-panel__error">{checkError}</p>
            )}
          </form>
        )}
      </div>

      <div className="profile-panel">
        <h2 className="profile-panel__title">KYC review history</h2>
        {customer.kycReviews.length === 0 ? (
          <p className="profile-panel__empty">No reviews recorded yet.</p>
        ) : (
          <ul className="review-list">
            {customer.kycReviews.map((review) => (
              <li key={review.id} className="review-list__item">
                <div className="review-list__header">
                  <StatusBadge
                    label={humanizeLabel(review.decision)}
                    tone={reviewDecisionTone(review.decision)}
                  />
                  <span className="review-list__reviewer">
                    {review.reviewer.name} ({humanizeLabel(review.reviewer.role)})
                  </span>
                </div>
                <p className="review-list__reason">{review.reason}</p>
                <span className="review-list__date">
                  {formatDateTime(review.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canReview && (
          <form className="review-form" onSubmit={handleSubmitReview}>
            <label className="review-form__field">
              <span>Decision</span>
              <select
                value={reviewDecision}
                onChange={(event) =>
                  setReviewDecision(event.target.value as ReviewDecision)
                }
              >
                {REVIEW_DECISIONS.map((decision) => (
                  <option key={decision} value={decision}>
                    {humanizeLabel(decision)}
                  </option>
                ))}
              </select>
            </label>
            <label className="review-form__field">
              <span>Reason</span>
              <textarea
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
                rows={3}
                placeholder="At least 5 characters"
              />
            </label>
            <button
              type="submit"
              className="review-form__submit"
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? "Submitting…" : "Submit review"}
            </button>
            {reviewError && (
              <p className="profile-panel__error">{reviewError}</p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

export default CustomerProfilePage;
