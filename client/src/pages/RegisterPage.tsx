import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { register } from "../services/auth.service";
import { ApiError } from "../types/api";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validate(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): FieldErrors {
  const errors: FieldErrors = {};

  // Mirrors server/src/schemas/auth.schema.ts `registerSchema` exactly,
  // for a good client-side experience — the backend remains authoritative.
  if (!name.trim()) {
    errors.name = "Full name is required.";
  } else if (name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

/**
 * Public registration. There is deliberately no role selector anywhere
 * on this page or in the request it sends — the backend always creates
 * ANALYST accounts (server/src/services/auth.service.ts `registerUser`
 * hardcodes role: "ANALYST", and the Zod schema strips any `role` field
 * a client might try to send). This form cannot give a user elevated
 * access even if it wanted to.
 */
function RegisterPage() {
  const { status } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const errors = validate(name, email, password, confirmPassword);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      // POST /api/auth/register with only { name, email, password } —
      // exactly server/src/schemas/auth.schema.ts's registerSchema.
      // The returned token is intentionally not used: the user signs in
      // normally on the existing login page afterward.
      await register({ name: name.trim(), email: email.trim(), password });
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (error) {
      if (error instanceof ApiError) {
        // Preserves the backend's own message, e.g. "An account with
        // this email already exists" (409) or the Zod "Validation
        // failed" message (400).
        setSubmitError(error.message);
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="login-card__brand-text">Ram Compliance</span>
        </div>

        <h1 className="login-card__heading">Create your account</h1>
        <p className="login-card__subheading">
          New accounts start with Analyst access. An administrator can
          grant additional permissions later.
        </p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-form__field">
            <span className="login-form__label">Full name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              disabled={submitting}
            />
            {fieldErrors.name && (
              <span className="login-form__error">{fieldErrors.name}</span>
            )}
          </label>

          <label className="login-form__field">
            <span className="login-form__label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              disabled={submitting}
            />
            {fieldErrors.email && (
              <span className="login-form__error">{fieldErrors.email}</span>
            )}
          </label>

          <label className="login-form__field">
            <span className="login-form__label">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              disabled={submitting}
            />
            {fieldErrors.password && (
              <span className="login-form__error">
                {fieldErrors.password}
              </span>
            )}
          </label>

          <label className="login-form__field">
            <span className="login-form__label">Confirm password</span>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              disabled={submitting}
            />
            {fieldErrors.confirmPassword && (
              <span className="login-form__error">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </label>

          {submitError && (
            <p className="login-form__submit-error" role="alert">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            className="login-form__submit"
            disabled={submitting}
          >
            {submitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="login-card__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
