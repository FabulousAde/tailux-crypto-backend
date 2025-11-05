import axios from "axios";
import Wallet from "../models/walletModel.js";
import User from "../models/userModel.js"; // ensure this path matches your project

// ─────────────────────────────────────────────
// 1️⃣ GET all wallets for a logged-in user
// ─────────────────────────────────────────────
export const getAllWallets = async (req, res) => {
  try {
    const wallets = await Wallet.findAll({ where: { user_id: req.user.id } });
    return res.json(wallets);
  } catch (err) {
    console.error("❌ Error fetching wallets:", err);
    return res.status(500).json({ message: "Error fetching wallets" });
  }
};

// ─────────────────────────────────────────────
// 2️⃣ INIT wallets (BTC + ETH) if missing
// ─────────────────────────────────────────────
export const initWallets = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { user_id } = req.body || {};
    const targetUserId = user_id || requesterId;

    // ✅ verify user exists
    const u = await User.findByPk(targetUserId);
    if (!u) {
      return res.status(404).json({ message: "Target user not found", user_id: targetUserId });
    }

    const coins = ["BTC", "ETH"];
    const created = [];

    for (const coin of coins) {
      const [wallet, isNew] = await Wallet.findOrCreate({
        where: { user_id: targetUserId, coin },
        defaults: { balance_coin: 0, balance_usd: 0 },
      });
      if (isNew) created.push(wallet);
    }

    return res.json({
      message: created.length ? "Wallets created" : "Wallets already exist",
      user_id: targetUserId,
      wallets: created,
    });
  } catch (err) {
    console.error("❌ Error initializing wallets:", err);
    return res.status(500).json({ message: "Error initializing wallets" });
  }
};

// ─────────────────────────────────────────────
// 3️⃣ UPDATE wallet prices (fetch from CoinGecko)
// ─────────────────────────────────────────────
export const updateWalletPrices = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data } = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
    );

    const btcPrice = data.bitcoin.usd;
    const ethPrice = data.ethereum.usd;

    const wallets = await Wallet.findAll({ where: { user_id: userId } });
    for (const wallet of wallets) {
      if (wallet.coin === "BTC") {
        wallet.balance_usd = parseFloat(wallet.balance_coin) * btcPrice;
      } else if (wallet.coin === "ETH") {
        wallet.balance_usd = parseFloat(wallet.balance_coin) * ethPrice;
      }
      wallet.updated_at = new Date();
      await wallet.save();
    }

    return res.json({
      message: "Wallet prices updated successfully",
      btc_price: btcPrice,
      eth_price: ethPrice,
    });
  } catch (err) {
    console.error("❌ Error updating wallet prices:", err);
    return res.status(500).json({ message: "Error updating wallet prices" });
  }
};

// ─────────────────────────────────────────────
// 4️⃣ TOTAL wallet summary (BTC + ETH + Total USD)
// ─────────────────────────────────────────────
export const getWalletTotal = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallets = await Wallet.findAll({ where: { user_id: userId } });

    const btc = wallets.find((w) => w.coin === "BTC") || { balance_coin: 0, balance_usd: 0 };
    const eth = wallets.find((w) => w.coin === "ETH") || { balance_coin: 0, balance_usd: 0 };

    const total_usd = parseFloat(btc.balance_usd) + parseFloat(eth.balance_usd);

    return res.json({
      btc: { balance_coin: btc.balance_coin, balance_usd: btc.balance_usd },
      eth: { balance_coin: eth.balance_coin, balance_usd: eth.balance_usd },
      total_usd,
    });
  } catch (err) {
    console.error("❌ Error retrieving total wallet balance:", err);
    return res.status(500).json({ message: "Error retrieving total wallet balance" });
  }
};

// ─────────────────────────────────────────────
// 5️⃣ UPDATE wallet balance (Admin or User)
// ─────────────────────────────────────────────
export const updateWalletBalance = async (req, res) => {
  try {
    const requesterId = req.user.id;
    let { user_id, coin, amount, type } = req.body;

    if (!coin || !amount || !type) {
      return res.status(400).json({ message: "coin, amount, and type are required" });
    }

    coin = String(coin).trim().toUpperCase();
    const targetUserId = user_id || requesterId;

    // ✅ verify target user exists before FK insert
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        message: "Target user not found in Users table",
        user_id: targetUserId,
      });
    }

    // ✅ find or create wallet
    let wallet = await Wallet.findOne({ where: { user_id: targetUserId, coin } });
    if (!wallet) {
      wallet = await Wallet.create({
        user_id: targetUserId,
        coin,
        balance_coin: 0,
        balance_usd: 0,
      });
      console.log(`🪙 Created new ${coin} wallet for user ${targetUserId}`);
    }

    // ✅ apply update logic
    let newBalance = parseFloat(wallet.balance_coin);
    const amt = Math.abs(parseFloat(amount));

    if (type === "deposit") {
      newBalance += amt;
    } else if (type === "withdraw") {
      if (newBalance < amt) {
        return res.status(400).json({ message: "Insufficient funds" });
      }
      newBalance -= amt;
    } else {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    wallet.balance_coin = newBalance;
    wallet.updated_at = new Date();
    await wallet.save();

    console.log(`✅ Wallet ${type} successful for user ${targetUserId}`);

    return res.json({
      message: `Wallet ${type} successful`,
      user_id: targetUserId,
      coin: wallet.coin,
      new_balance: wallet.balance_coin,
    });
  } catch (err) {
    console.error("❌ Error updating wallet balance:", err);
    return res.status(500).json({ message: "Error updating wallet balance" });
  }
};
