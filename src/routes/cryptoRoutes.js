// routes/cryptoRoutes.js
import express from "express";
import axios from "axios";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Proxy endpoint for crypto prices + 7-day chart data
router.get("/prices", verifyToken, async (req, res) => {
  try {
    const currency = req.query.currency || "usd";

    // 1️⃣ Fetch main prices (current price + 24hr change)
    const mainRes = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: "bitcoin,ethereum,litecoin",
          vs_currencies: currency,
          include_24hr_change: "true",
        },
      }
    );

    const baseData = mainRes.data;

    // 2️⃣ Fetch 7-day chart data for each coin
    const [btcChart, ethChart, ltcChart] = await Promise.all([
      axios.get("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart", {
        params: { vs_currency: currency, days: "7" },
      }),
      axios.get("https://api.coingecko.com/api/v3/coins/ethereum/market_chart", {
        params: { vs_currency: currency, days: "7" },
      }),
      axios.get("https://api.coingecko.com/api/v3/coins/litecoin/market_chart", {
        params: { vs_currency: currency, days: "7" },
      }),
    ]);

    const simplify = (chartData) =>
      chartData.data.prices.map((p) => p[1]);

    // 3️⃣ Combine all data into one unified response
    const combined = {
      bitcoin: {
        ...baseData.bitcoin,
        chartData: simplify(btcChart),
      },
      ethereum: {
        ...baseData.ethereum,
        chartData: simplify(ethChart),
      },
      litecoin: {
        ...baseData.litecoin,
        chartData: simplify(ltcChart),
      },
    };

    res.json({ success: true, data: combined });
  } catch (error) {
    console.error("❌ Error fetching crypto data:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch crypto data",
    });
  }
});

export default router;
