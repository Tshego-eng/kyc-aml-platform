import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../types/api";

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  return errors;
}

function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — no reason to show the form again.
  if (status === "authenticated") {
    const redirectTo =
      (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      // POST /api/auth/login with { email, password } — the exact
      // fields server/src/controllers/auth.controller.ts expects.
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        // Preserve the backend's own message, e.g. "Invalid email or
        // password" (401) or "Email and password are required" (400).
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
          <span className="app-shell__mark" aria-hidden="true" />
          <span className="login-card__brand-text">Sanisa Compliance</span>
        </div>

        <h1 className="login-card__heading">Sign in</h1>
        <p className="login-card__subheading">
          KYC / AML compliance workspace access.
        </p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
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
              autoComplete="current-password"
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
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
