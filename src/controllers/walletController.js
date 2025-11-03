import axios from "axios";
import Wallet from "../models/walletModel.js";

// ─────────────────────────────────────────────
// 1️⃣ GET all wallets for a logged-in user
// ─────────────────────────────────────────────
export const getAllWallets = async (req, res) => {
  try {
    const wallets = await Wallet.findAll({ where: { user_id: req.user.id } });
    res.json(wallets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching wallets" });
  }
};

// ─────────────────────────────────────────────
// 2️⃣ INIT wallets (BTC + ETH) if missing
// ─────────────────────────────────────────────
export const initWallets = async (req, res) => {
  try {
    const userId = req.user.id;
    const coins = ["BTC", "ETH"];
    let created = [];

    for (const coin of coins) {
      const [wallet, isNew] = await Wallet.findOrCreate({
        where: { user_id: userId, coin },
        defaults: { balance_coin: 0, balance_usd: 0 },
      });
      if (isNew) created.push(wallet);
    }

    res.json({
      message: created.length ? "Wallets created" : "Wallets already exist",
      wallets: created,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error initializing wallets" });
  }
};

// ─────────────────────────────────────────────
// 3️⃣ UPDATE wallet prices (fetch from CoinGecko)
// ─────────────────────────────────────────────
export const updateWalletPrices = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch live prices from CoinGecko
    const { data } = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
    );

    const btcPrice = data.bitcoin.usd;
    const ethPrice = data.ethereum.usd;

    // Fetch user's wallets
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

    res.json({
      message: "Wallet prices updated successfully",
      btc_price: btcPrice,
      eth_price: ethPrice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating wallet prices" });
  }
};

// ─────────────────────────────────────────────
// 4️⃣ TOTAL wallet summary (BTC + ETH + Total USD)
// ─────────────────────────────────────────────
export const getWalletTotal = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallets = await Wallet.findAll({ where: { user_id: userId } });

    const btc = wallets.find(w => w.coin === "BTC") || { balance_coin: 0, balance_usd: 0 };
    const eth = wallets.find(w => w.coin === "ETH") || { balance_coin: 0, balance_usd: 0 };

    const total_usd = parseFloat(btc.balance_usd) + parseFloat(eth.balance_usd);

    res.json({
      btc: { balance_coin: btc.balance_coin, balance_usd: btc.balance_usd },
      eth: { balance_coin: eth.balance_coin, balance_usd: eth.balance_usd },
      total_usd,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error retrieving total wallet balance" });
  }
};

// ─────────────────────────────────────────────
// 5️⃣ UPDATE wallet balance (Deposit / Withdraw)
// ─────────────────────────────────────────────
export const updateWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { coin, amount, type } = req.body; // e.g. { "coin": "BTC", "amount": 0.01, "type": "deposit" }

    if (!coin || !amount || !type)
      return res.status(400).json({ message: "coin, amount, and type are required" });

    const wallet = await Wallet.findOne({ where: { user_id: userId, coin } });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    // Apply logic
    let newBalance = parseFloat(wallet.balance_coin);
    if (type === "deposit") {
      newBalance += parseFloat(amount);
    } else if (type === "withdraw") {
      if (newBalance < amount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }
      newBalance -= parseFloat(amount);
    } else {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    // Update balance
    wallet.balance_coin = newBalance;
    wallet.updated_at = new Date();
    await wallet.save();

    res.json({
      message: `Wallet ${type} successful`,
      coin: wallet.coin,
      balance_coin: wallet.balance_coin,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating wallet balance" });
  }
};

