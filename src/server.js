// src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sequelize from "./config/db.js";

// import models (ensure associations are registered before syncing)
import "./models/userModel.js";
import "./models/walletModel.js";
import "./models/transactionModel.js";

// import routes
import walletRoutes from "./routes/walletRoutes.js"; // wallets route (you’ll add more later)
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────────────────────────────
// 🧩 Middlewares
// ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────────────────────
// 🌐 Routes
// ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).send({
    message: "🚀 Tailux Crypto API is live and connected",
    docs: "/api/wallets/total",
  });
});

app.use("/api/wallets", walletRoutes); // wallet endpoints
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

// ──────────────────────────────────────────────────────────────
// 🔌 Server + Database Connection
// ──────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connection successful!");

    await sequelize.sync({ alter: true });
    console.log("🧱 Database synced — tables ready!");

    app.listen(PORT, () =>
      console.log(`🚀 Tailux Crypto API running on http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1); // exit on critical DB failure
  }
};

startServer();
