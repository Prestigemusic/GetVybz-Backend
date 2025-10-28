import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  calculateTrustScore,
  recalcAllTrustScores,
  getTrustScoreByUser,
} from "../services/trustScoreService.js";

const router = express.Router();

/**
 * GET /api/trustscore/:userId
 * Fetch a user’s trust score
 */
router.get("/:userId", protect, async (req, res) => {
  try {
    const data = await getTrustScoreByUser(req.params.userId);
    res.status(200).json(data);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

/**
 * POST /api/trustscore/recalculate/:userId
 * Force recalculation for a specific user
 */
router.post("/recalculate/:userId", protect, async (req, res) => {
  try {
    const data = await calculateTrustScore(req.params.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/trustscore/recalculate-all
 * Admin: recalc trust scores for all users
 */
router.post("/recalculate-all", protect, adminOnly, async (req, res) => {
  try {
    const results = await recalcAllTrustScores();
    res.status(200).json({ success: true, count: results.length, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
