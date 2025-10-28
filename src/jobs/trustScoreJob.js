import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import logger from "../utils/logger.js";

/**
 * Recalculate Trust Factor (TFBS) for a user
 */
export const recalcTrustScoreJob = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // --- Example TFBS calculation ---
    // Trust (verified) = 40%
    const trustScore = user.verified ? 40 : 0;

    // Feedback (average rating) = 30%
    const ratingScore = ((user.rating || 0) / 5) * 30;

    // Booking completion rate = 20%
    const bookings = await Booking.find({ $or: [{ customerId: userId }, { proId: userId }] });
    const completed = bookings.filter(b => b.status === "completed").length;
    const completionRate = bookings.length ? (completed / bookings.length) * 20 : 0;

    // Dispute history = -10% penalty if any
    const disputes = bookings.filter(b => b.dispute);
    const disputePenalty = disputes.length ? -10 : 0;

    const TFBS = Math.max(0, trustScore + ratingScore + completionRate + disputePenalty);
    user.TFBS = TFBS;
    await user.save();

    logger.info(`🔁 TFBS recalculated for user ${userId}: ${TFBS}`);
    return TFBS;
  } catch (err) {
    logger.error(`TFBS recalculation failed for user ${userId}`, err);
    throw err;
  }
};
