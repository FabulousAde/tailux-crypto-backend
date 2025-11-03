// src/models/walletModel.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./userModel.js";

const Wallet = sequelize.define("Wallet", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  coin: { type: DataTypes.STRING, allowNull: false }, // BTC or ETH
  balance_coin: { type: DataTypes.DECIMAL(20, 8), defaultValue: 0 },
  balance_usd: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: false });

User.hasMany(Wallet, { foreignKey: "user_id" });
Wallet.belongsTo(User, { foreignKey: "user_id" });

export default Wallet;
