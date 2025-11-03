import express from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  getProfile,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Auth endpoints
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify/:token", verifyEmail);
router.get("/me", verifyToken, getProfile);

export default router;
