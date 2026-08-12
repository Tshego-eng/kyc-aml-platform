import { Router } from "express";
import { register, login } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.get("/test", (_req, res) => {
  res.json({
    message: "Authentication routes are working",
  });
});

export default router;