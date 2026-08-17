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

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// -------------------------
// Security middleware
// -------------------------

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
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

// -------------------------
// Start server
// -------------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});