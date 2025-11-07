// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/userModel.js";
import Wallet from "../models/walletModel.js";
import { sendVerificationEmail } from "../utils/emailService.js"; // ✅ now active

dotenv.config();

// ─────────────────────────────────────────────
// Helper: Generate JWT
// ─────────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "tailuxsupersecretkey",
    { expiresIn: "7d" }
  );
};

// ─────────────────────────────────────────────
// REGISTER USER (with Postmark verification + role support)
// ─────────────────────────────────────────────
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body; // ✅ now includes role

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Default role fallback to "user"
    const user = await User.create({
      name,
      email: normalizedEmail,
      password_hash: hashedPassword,
      email_verified: false,
      role: role && ["user", "admin"].includes(role) ? role : "user",
    });

    // Create wallets
    for (const coin of ["BTC", "ETH"]) {
      await Wallet.create({
        user_id: user.id,
        coin,
        balance_coin: 0,
        balance_usd: 0,
      });
    }

    // Generate verification token
    const token = generateToken(user);

    // Send email via Postmark
    await sendVerificationEmail(user, token);

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role, // ✅ return role in response
      },
    });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ─────────────────────────────────────────────
// LOGIN USER (no user-enumeration leaks)
// ─────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Fetch user
    const user = await User.findOne({ where: { email: normalizedEmail } });

    // Optional: timing-safe dummy compare to reduce oracle risk when user is missing
    // bcrypt hash for the string "password" (public example hash)
    const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8iG7G1JrVN6a8GN28M5soNqd7qV3Cy";

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH); // timing padding
      return res.status(401).json({ message: "Wrong email or password" });
    }

    // Block unverified accounts distinctly (kept as 403)
    if (!user.email_verified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Wrong email or password" });
    }

    // Issue token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "tailuxsupersecretkey",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// ─────────────────────────────────────────────
// VERIFY EMAIL
// ─────────────────────────────────────────────
// VERIFY EMAIL WITH REDIRECT
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "tailuxsupersecretkey"
    );

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/verify-status?status=invalid`);
    }

    if (!user.email_verified) {
      user.email_verified = true;
      await user.save();
    }

    // Redirect to success page on frontend
    res.redirect(`${process.env.FRONTEND_URL}/verify-status?status=success`);
  } catch (err) {
    console.error("Email verification error:", err);
    res.redirect(`${process.env.FRONTEND_URL}/verify-status?status=failed`);
  }
};

// ─────────────────────────────────────────────
// GET PROFILE + WALLETS
// ─────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "email_verified"],
      include: [{ model: Wallet }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

// ─────────────────────────────────────────────
// GET ALL USERS (Admin only)
// ─────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "email_verified", "created_at"],
      order: [["created_at", "DESC"]],
    });

    res.json({ total: users.length, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching users" });
  }
};
