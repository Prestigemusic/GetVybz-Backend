import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createReview, getProReviews } from "../services/reviewService.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * @route POST /api/reviews/:bookingId
 * @desc Submit a review for a completed booking
 * @access Protected
 */
router.post("/:bookingId", protect, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, comment } = req.body;

    const review = await createReview({
      bookingId,
      reviewerId: req.user.id,
      rating,
      comment,
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    logger.error("Review submission failed", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/reviews/pro/:proId
 * @desc Get all reviews for a Pro
 * @access Public
 */
router.get("/pro/:proId", async (req, res) => {
  try {
    const reviews = await getProReviews(req.params.proId);
    res.json({ success: true, data: reviews });
  } catch (err) {
    logger.error("Fetch reviews failed", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
