import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/userModel.js";
import Wallet from "../models/walletModel.js";
// import { sendVerificationEmail } from "../utils/emailService.js"; // 🚫 commented out

dotenv.config();

// helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "tailuxsupersecretkey",
    { expiresIn: "7d" }
  );
};

// ─────────────────────────────────────────────
// REGISTER USER (Email verification disabled)
// ─────────────────────────────────────────────
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password_hash: hashedPassword,
      email_verified: true, // ✅ mark verified automatically for now
    });

    // Create default wallets
    for (const coin of ["BTC", "ETH"]) {
      await Wallet.create({
        user_id: user.id,
        coin,
        balance_coin: 0,
        balance_usd: 0,
      });
    }

    // 🚫 Commented out email verification for now
    // const verifyToken = generateToken({ id: user.id, email: user.email }, "24h");
    // await sendVerificationEmail(user.email, verifyToken);

    res.status(201).json({
      message: "User registered successfully.",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ─────────────────────────────────────────────
// LOGIN USER
// ─────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// ─────────────────────────────────────────────
// VERIFY EMAIL (kept for later use)
// ─────────────────────────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "tailuxsupersecretkey"
    );

    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json({ message: "Invalid token" });

    user.email_verified = true;
    await user.save();

    res.send(
      `<h2>Email verified successfully ✅</h2><p>You can now close this tab.</p>`
    );
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .send(`<h3>Verification link expired or invalid ❌</h3>`);
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
