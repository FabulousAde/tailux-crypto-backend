// routes/cryptoRoutes.js
import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Cache crypto data for 5 minutes (300s)
const cache = new NodeCache({ stdTTL: 300 });

// ✅ Helper to simplify chart arrays
const simplifyChart = (chartData) => chartData.data.prices.map((p) => p[1]);

/**
 * GET /api/crypto/prices?currency=usd
 * Returns BTC, ETH, and LTC prices + 7-day chart data
 */
router.get("/prices", verifyToken, async (req, res) => {
  const currency = req.query.currency?.toLowerCase() || "usd";
  const cacheKey = `crypto-prices-${currency}`;

  try {
    // 1️⃣ Serve cached data if available
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("✅ Serving cached crypto data");
      return res.json({
        success: true,
        cached: true,
        source: "cache",
        data: cached,
      });
    }

    console.log("⚡ Fetching fresh data from CoinGecko");

    // 2️⃣ Fetch main price data
    const { data: baseData } = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: "bitcoin,ethereum,litecoin",
          vs_currencies: currency,
          include_24hr_change: "true",
        },
        timeout: 10000,
      }
    );

    // 3️⃣ Fetch 7-day charts concurrently
    const [btcChart, ethChart, ltcChart] = await Promise.all([
      axios.get("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart", {
        params: { vs_currency: currency, days: "7" },
        timeout: 10000,
      }),
      axios.get("https://api.coingecko.com/api/v3/coins/ethereum/market_chart", {
        params: { vs_currency: currency, days: "7" },
        timeout: 10000,
      }),
      axios.get("https://api.coingecko.com/api/v3/coins/litecoin/market_chart", {
        params: { vs_currency: currency, days: "7" },
        timeout: 10000,
      }),
    ]);

    // 4️⃣ Combine base data and chart data
    const combined = {
      bitcoin: { ...baseData.bitcoin, chartData: simplifyChart(btcChart) },
      ethereum: { ...baseData.ethereum, chartData: simplifyChart(ethChart) },
      litecoin: { ...baseData.litecoin, chartData: simplifyChart(ltcChart) },
    };

    // 5️⃣ Cache the result
    cache.set(cacheKey, combined);
    console.log("🧱 Cached fresh crypto data");

    return res.json({
      success: true,
      cached: false,
      source: "live",
      data: combined,
    });
  } catch (error) {
    console.error("❌ Error fetching crypto data:", error.message);

    // 6️⃣ Handle rate limit or downtime — serve last known data if available
    const fallback = cache.get(cacheKey);
    if (fallback) {
      console.warn("⚠️ Serving last cached crypto data (CoinGecko unavailable)");
      return res.json({
        success: true,
        stale: true,
        data: fallback,
        message: "CoinGecko unavailable — serving last cached data.",
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: "CoinGecko rate limit reached — please try again shortly.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch crypto data.",
    });
  }
});

export default router;
