import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createCustomer } from "../services/customer.service";
import { ApiError } from "../types/api";

interface FormState {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  idNumber: string;
  country: string;
  address: string;
  phone: string;
  email: string;
  occupation: string;
  annualIncome: string;
  sourceOfFunds: string;
}

const INITIAL_STATE: FormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  idNumber: "",
  country: "",
  address: "",
  phone: "",
  email: "",
  occupation: "",
  annualIncome: "",
  sourceOfFunds: "",
};

/**
 * POST /api/customers — required fields (firstName, lastName,
 * dateOfBirth, idNumber, country) match CreateCustomerData exactly
 * (server/src/services/customer.service.ts); everything else is
 * optional there. The backend has no dedicated validation schema for
 * this route, so required-field and email-format checks here are the
 * primary defense against a generic 500 from a malformed request.
 */
function CustomerCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required.";
    if (!form.lastName.trim()) errors.lastName = "Last name is required.";
    if (!form.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
    if (!form.idNumber.trim()) errors.idNumber = "ID number is required.";
    if (!form.country.trim()) errors.country = "Country is required.";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (form.annualIncome.trim() && Number.isNaN(Number(form.annualIncome))) {
      errors.annualIncome = "Enter a valid number.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCustomer({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        idNumber: form.idNumber.trim(),
        country: form.country.trim(),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.occupation.trim() ? { occupation: form.occupation.trim() } : {}),
        ...(form.annualIncome.trim()
          ? { annualIncome: Number(form.annualIncome) }
          : {}),
        ...(form.sourceOfFunds.trim()
          ? { sourceOfFunds: form.sourceOfFunds.trim() }
          : {}),
      });
      navigate(`/customers/${res.customer.id}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.kind === "conflict") {
        // Backend returns 409 for ID_NUMBER_ALREADY_EXISTS.
        setFieldErrors((prev) => ({ ...prev, idNumber: error.message }));
      } else {
        setSubmitError(
          error instanceof ApiError
            ? error.message
            : "Unable to create this customer."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="customer-profile">
      <div>
        <Link to="/customers" className="customer-profile__back">
          ← Customers
        </Link>
        <h1 className="dashboard__heading">Create Customer</h1>
        <p className="dashboard__subheading">
          Add a new customer to the compliance system
        </p>
      </div>

      <form className="profile-panel create-customer-form" onSubmit={handleSubmit}>
        <h2 className="profile-panel__title">Customer information</h2>

        <div className="form-grid">
          <label className="review-form__field">
            <span>First name *</span>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              aria-invalid={Boolean(fieldErrors.firstName)}
            />
            {fieldErrors.firstName && (
              <span className="login-form__error">{fieldErrors.firstName}</span>
            )}
          </label>

          <label className="review-form__field">
            <span>Last name *</span>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              aria-invalid={Boolean(fieldErrors.lastName)}
            />
            {fieldErrors.lastName && (
              <span className="login-form__error">{fieldErrors.lastName}</span>
            )}
          </label>

          <label className="review-form__field">
            <span>Date of birth *</span>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
              aria-invalid={Boolean(fieldErrors.dateOfBirth)}
            />
            {fieldErrors.dateOfBirth && (
              <span className="login-form__error">{fieldErrors.dateOfBirth}</span>
            )}
          </label>

          <label className="review-form__field">
            <span>ID number *</span>
            <input
              type="text"
              value={form.idNumber}
              onChange={(e) => updateField("idNumber", e.target.value)}
              aria-invalid={Boolean(fieldErrors.idNumber)}
            />
            {fieldErrors.idNumber && (
              <span className="login-form__error">{fieldErrors.idNumber}</span>
            )}
          </label>

          <label className="review-form__field">
            <span>Country *</span>
            <input
              type="text"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              aria-invalid={Boolean(fieldErrors.country)}
            />
            {fieldErrors.country && (
              <span className="login-form__error">{fieldErrors.country}</span>
            )}
          </label>

          <label className="review-form__field">
            <span>Phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </label>

          <label className="review-form__field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <span className="login-form__error">{fieldErrors.email}</span>
            )}
          </label>

          <label className="review-form__field">
            <span>Occupation</span>
            <input
              type="text"
              value={form.occupation}
              onChange={(e) => updateField("occupation", e.target.value)}
            />
          </label>

          <label className="review-form__field">
            <span>Annual income</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.annualIncome}
              onChange={(e) => updateField("annualIncome", e.target.value)}
              aria-invalid={Boolean(fieldErrors.annualIncome)}
            />
            {fieldErrors.annualIncome && (
              <span className="login-form__error">{fieldErrors.annualIncome}</span>
            )}
          </label>

          <label className="review-form__field">
            <span>Source of funds</span>
            <input
              type="text"
              value={form.sourceOfFunds}
              onChange={(e) => updateField("sourceOfFunds", e.target.value)}
            />
          </label>

          <label className="review-form__field form-grid__full">
            <span>Address</span>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </label>
        </div>

        <div className="create-customer-form__actions">
          <Link to="/customers" className="profile-panel__action">
            Cancel
          </Link>
          <button
            type="submit"
            className="review-form__submit"
            disabled={submitting}
          >
            {submitting ? "Creating customer…" : "Create customer"}
          </button>
        </div>
        {submitError && <p className="profile-panel__error">{submitError}</p>}
      </form>
    </section>
  );
}

export default CustomerCreatePage;
