import express from "express";
import {
  getAllWallets,
  initWallets,
  updateWalletPrices,
  getWalletTotal,
  updateWalletBalance
} from "../controllers/walletController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getAllWallets);
router.post("/init", verifyToken, initWallets);
router.put("/update-prices", verifyToken, updateWalletPrices);
router.get("/total", verifyToken, getWalletTotal);
router.put("/update", verifyToken, updateWalletBalance);

export default router;
