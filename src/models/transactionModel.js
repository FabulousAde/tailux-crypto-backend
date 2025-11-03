// src/models/transactionModel.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./userModel.js";

const Transaction = sequelize.define(
  "Transaction",
  {
    // Unique transaction ID
    activity_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Defines the kind of transaction
    activity_key: {
      type: DataTypes.STRING,
      allowNull: false, // deposit | withdrawal | reward
    },

    // Human-readable version
    activity_title: {
      type: DataTypes.STRING,
      allowNull: false, // e.g., "Deposit"
    },

    // Optional label for display purposes (same as title for now)
    activity_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Which wallet/coin this applies to
    account_name: {
      type: DataTypes.STRING,
      allowNull: false, // BTC or ETH
    },

    // When the transaction occurred
    transaction_date: {
      type: DataTypes.BIGINT, // store epoch ms (e.g., 1761091200000)
      defaultValue: () => Date.now(),
    },

    // Amount of crypto transacted (e.g., 0.002 BTC)
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },

    // Transaction status
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending", // completed | pending | failed
    },
  },
  {
    timestamps: false,
    tableName: "Transactions",
  }
);

// ──────────────────────────────────────────────────────────────
// Relationships
// ──────────────────────────────────────────────────────────────
User.hasMany(Transaction, { foreignKey: "user_id" });
Transaction.belongsTo(User, { foreignKey: "user_id" });

export default Transaction;
