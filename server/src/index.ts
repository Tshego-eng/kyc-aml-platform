import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import rbacRoutes from "./routes/rbac.routes";
import auditRoutes from "./routes/audit.routes";

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
// -------------------------
// Start server
// -------------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});