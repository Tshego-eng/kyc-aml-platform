import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import customerRoutes from "./routes/customer.routes";
import authRoutes from "./routes/auth.routes";
import rbacRoutes from "./routes/rbac.routes";
import auditRoutes from "./routes/audit.routes";
import kycRoutes from "./routes/kyc.routes";
import kycReviewRoutes from "./routes/kyc-review.routes";
import riskRoutes from "./routes/risk.routes";
import transactionRoutes from "./routes/transaction.routes";
import amlAlertRoutes from "./routes/aml-alert.routes";
import amlCaseRoutes from "./routes/aml-case.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import regulatoryReportRoutes from "./routes/regulatory-report.routes";
import userRoutes from "./routes/user.routes";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// -------------------------
// Environment
// -------------------------

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

// -------------------------
// Security middleware
// -------------------------

app.use(helmet());

// The allowed frontend origin is environment-driven so the same build
// works in dev and production without code changes. In production this
// is required — failing fast at startup on a missing CORS_ORIGIN is
// safer than silently falling back to a permissive or wrong origin. In
// development, falling back to the existing local Vite dev server
// origin preserves the previous behavior exactly.
const corsOrigin = process.env.CORS_ORIGIN;

if (isProduction && !corsOrigin) {
  throw new Error(
    "CORS_ORIGIN must be set in production (e.g. https://your-frontend.pages.dev)."
  );
}

app.use(
  cors({
    origin: corsOrigin || "http://localhost:5173",
    credentials: true,
  })
);

// -------------------------
// Body parsing
// -------------------------

app.use(express.json());

// -------------------------
// Rate limiting
// -------------------------

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// Stricter limiter specifically for login, on top of the general API
// limiter above (both apply to this one path) — reduces brute-force/
// credential-stuffing exposure without touching every other endpoint.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again later.",
  },
});

app.use("/api/auth/login", authLimiter);

// -------------------------
// Routes
// -------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "KYC/AML API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/rbac", rbacRoutes);

app.use("/api/audit", auditRoutes);

app.use("/api/customers", customerRoutes);

app.use("/api", kycRoutes);

app.use("/api", kycReviewRoutes);

app.use("/api", riskRoutes);

app.use("/api", transactionRoutes);

app.use("/api", amlAlertRoutes);

app.use("/api", amlCaseRoutes);

app.use("/api", dashboardRoutes);

app.use("/api", regulatoryReportRoutes);

app.use("/api/users", userRoutes);

// -------------------------
// Global error handler (must be registered last, after all routes)
// -------------------------

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    // Full detail always goes to server-side logs, never to the client.
    console.error("Unhandled error:", err);

    res.status(500).json({
      error: "Internal server error",
      // Only include the message (never a stack trace) outside
      // production, as a local-dev convenience.
      ...(isProduction ? {} : { details: err.message }),
    });
  }
);

// -------------------------
// Start server
// -------------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (${NODE_ENV})`);
});
