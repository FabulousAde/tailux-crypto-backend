// routes/cryptoRoutes.js
import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Cache data for 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300 }); // 5 min TTL

router.get("/prices", verifyToken, async (req, res) => {
  const currency = req.query.currency || "usd";
  const cacheKey = `crypto-prices-${currency}`;

  try {
    // 1️⃣ Serve cached data if present
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Serving crypto data from cache");
      return res.json({ success: true, data: cachedData, cached: true });
    }

    console.log("⚡ Fetching fresh data from CoinGecko");

    // 2️⃣ Fetch current prices
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

    // 3️⃣ Fetch 7-day charts
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

    const simplify = (chartData) => chartData.data.prices.map((p) => p[1]);

    const combined = {
      bitcoin: { ...baseData.bitcoin, chartData: simplify(btcChart) },
      ethereum: { ...baseData.ethereum, chartData: simplify(ethChart) },
      litecoin: { ...baseData.litecoin, chartData: simplify(ltcChart) },
    };

    // 4️⃣ Cache before returning
    cache.set(cacheKey, combined);
    res.json({ success: true, data: combined });
  } catch (error) {
    console.error("❌ Error fetching crypto data:", error.message);

    // 5️⃣ Fallback: serve last cached data even if expired
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.warn("⚠️ Serving expired cached data due to CoinGecko error");
      return res.json({
        success: true,
        data: cachedData,
        stale: true,
        message: "Serving last known data (CoinGecko temporarily unavailable)",
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "CoinGecko rate limit reached — please try again shortly.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch crypto data",
    });
  }
});

export default router;
