import express from "express";
import {
  getAllTransactions,
  createTransaction,
  getTransactionsByWallet,
} from "../controllers/transactionController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getAllTransactions);
router.post("/create", verifyToken, createTransaction);
router.get("/by-wallet/:coin", verifyToken, getTransactionsByWallet);

export default router;
