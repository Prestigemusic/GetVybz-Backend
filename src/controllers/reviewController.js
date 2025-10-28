import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import { recalcTrustScoreJob } from "../jobs/tfbsJob.js";
import logger from "../utils/logger.js";
import { calculateTrustScore } from "../services/trustScoreService.js";


/**
 * Submit a review after booking completion
 */
export const createReview = async (req, res) => {
  try {
    const { bookingId, targetId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!bookingId || !targetId || !rating) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const review = await Review.create({
      bookingId,
      targetId,
      userId,
      rating,
      comment,
    });

    // Update booking review flags
    const booking = await Booking.findById(bookingId);
    if (booking) {
      if (String(booking.customerId) === String(userId)) booking.customerReviewed = true;
      if (String(booking.proId) === String(userId)) booking.proReviewed = true;
      await booking.save();
    }

    // 🔁 Trigger Trust Score recalculation
    await recalcTrustScoreJob(targetId);
    await calculateTrustScore(review.reviewedUserId);


    logger.info(`✅ Review submitted & TFBS updated for target ${targetId}`);
    res.status(201).json(review);
  } catch (err) {
    logger.error("Review submission failed", err);
    res.status(500).json({ message: "Failed to submit review" });
  }
};
