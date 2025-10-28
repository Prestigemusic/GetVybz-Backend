// src/routes/matchingRoutes.js
import express from "express";
import { recommendCreatives } from "../services/matchingService.js";
import { protect } from "../middleware/authMiddleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/match/recommendations
 * Body:
 *  - bookingId (optional) OR { tags, budgetMin, budgetMax, location, bookingDate }
 *  - useAI (optional boolean)
 *  - limit (optional)
 */
router.post("/recommendations", protect, async (req, res) => {
  try {
    const { bookingId, tags, budgetMin, budgetMax, location, bookingDate, limit, useAI } = req.body;

    const results = await recommendCreatives({
      bookingId,
      tags,
      budgetMin: budgetMin ?? 0,
      budgetMax: budgetMax ?? Infinity,
      location,
      bookingDate,
      limit: limit ?? 10,
      useAI: useAI !== undefined ? !!useAI : true,
    });

    res.json({ success: true, results });
  } catch (err) {
    logger.error("matchingRoutes error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
