import { Router } from "express";
import {
  register,
  login,
  getCurrentUser,
} from "../controllers/auth.controller";

import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.get("/me", authenticate, getCurrentUser);

router.get("/test", (_req, res) => {
  res.json({
    message: "Authentication routes are working",
  });
});

export default router;