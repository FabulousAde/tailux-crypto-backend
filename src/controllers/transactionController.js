import Transaction from "../models/transactionModel.js";
import Wallet from "../models/walletModel.js";

/**
 * GET /api/transactions
 * Returns all transactions for the logged-in user (BTC + ETH)
 */
export const getAllTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await Transaction.findAll({
      where: { user_id: userId },
      order: [["transaction_date", "DESC"]],
    });

    res.json({ count: transactions.length, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching transactions" });
  }
};

/**
 * POST /api/transactions/create
 * Supports single or multiple transactions
 */
export const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = Array.isArray(req.body) ? req.body : [req.body]; // accept one or many

    if (data.length === 0) {
      return res.status(400).json({ message: "No transaction data provided" });
    }

    const createdTransactions = [];

    for (const tx of data) {
      const { coin, type, amount, status } = tx;
      if (!coin || !type || !amount) continue;

      // Create transaction
      const newTx = await Transaction.create({
        user_id: userId,
        activity_key: type.toLowerCase(),
        activity_title: type.charAt(0).toUpperCase() + type.slice(1),
        activity_name: type.charAt(0).toUpperCase() + type.slice(1),
        account_name: coin.toUpperCase(),
        amount,
        transaction_date: Date.now(),
        status: status || "completed",
      });
      createdTransactions.push(newTx);

      // Update wallet balance
      const wallet = await Wallet.findOne({ where: { user_id: userId, coin } });
      if (wallet) {
        if (type === "deposit" || type === "reward") {
          wallet.balance_coin =
            parseFloat(wallet.balance_coin) + Math.abs(parseFloat(amount));
        } else if (type === "withdrawal") {
          wallet.balance_coin = Math.max(
            0,
            parseFloat(wallet.balance_coin) - Math.abs(parseFloat(amount))
          );
        }
        await wallet.save();
      }
    }

    res.status(201).json({
      message: `✅ ${createdTransactions.length} transaction(s) added successfully`,
      transactions: createdTransactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating transactions" });
  }
};

/**
 * GET /api/transactions/by-wallet/:coin
 * Returns transactions for a specific wallet (BTC or ETH)
 */
export const getTransactionsByWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { coin } = req.params;

    const txs = await Transaction.findAll({
      where: { user_id: userId, account_name: coin.toUpperCase() },
      order: [["transaction_date", "DESC"]],
    });

    res.json({ coin: coin.toUpperCase(), count: txs.length, transactions: txs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching transactions by wallet" });
  }
};
