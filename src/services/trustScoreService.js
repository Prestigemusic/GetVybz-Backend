import TrustScore from "../models/TrustScore.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import adminNotificationService from "./adminNotificationService.js";

// uses your working admin notifier
import logger from "../utils/logger.js";

/**
 * Helper: normalize score to 0–100
 */
const normalize = (value, max = 1) => Math.min(100, Math.max(0, (value / max) * 100));
const { notifyAdmin } = adminNotificationService;


/**
 * Calculate TrustScore breakdown for a given user
 */
export const calculateTrustScore = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // --- Compute components ---
    const verificationScore = user.isVerified ? 100 : 40; // Example weighting
    const reviews = await Review.find({ reviewedUserId: userId });
    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    const feedbackScore = normalize(avgRating, 5);

    const bookings = await Booking.find({ $or: [{ customerId: userId }, { proId: userId }] });
    const completed = bookings.filter((b) => b.status === "completed").length;
    const total = bookings.length;
    const bookingScore = total > 0 ? normalize(completed / total) : 0;

    const disputes = bookings.filter((b) => b.status === "disputed").length;
    const disputePenalty = disputes > 0 ? Math.min(20, disputes * 5) : 0;
    const systemScore = Math.max(0, 100 - disputePenalty);

    // --- Weighted total ---
    const weights = { trust: 0.25, feedback: 0.35, booking: 0.3, system: 0.1 };
    const finalScore =
      verificationScore * weights.trust +
      feedbackScore * weights.feedback +
      bookingScore * weights.booking +
      systemScore * weights.system;

    // --- Persist ---
    const existing = await TrustScore.findOne({ userId });
    const previousScore = existing?.score || 0;

    const newData = {
      userId,
      score: Math.round(finalScore),
      breakdown: {
        trust: Math.round(verificationScore),
        feedback: Math.round(feedbackScore),
        booking: Math.round(bookingScore),
        system: Math.round(systemScore),
      },
      lastCalculatedAt: new Date(),
      previousScore,
    };

    const trustScore = existing
      ? await TrustScore.findOneAndUpdate({ userId }, newData, { new: true })
      : await TrustScore.create(newData);

    // --- Update user profile for quick access ---
    user.trustScore = trustScore.score;
    await user.save();

    // --- Notify Admin if major drop ---
    if (previousScore - trustScore.score > 15) {
      await notifyAdmin(
        "TrustScore Drop Alert",
        `User ${user.fullName || user.email} dropped from ${previousScore} to ${trustScore.score}.`
      );
    }

    logger.info(`[TrustScore] Updated for user ${user._id}: ${trustScore.score}`);
    return trustScore;
  } catch (error) {
    logger.error(`[TrustScore] Calculation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Manual admin recalculation (e.g. for all users)
 */
export const recalcAllTrustScores = async () => {
  const users = await User.find();
  const results = [];

  for (const u of users) {
    const t = await calculateTrustScore(u._id);
    results.push({ userId: u._id, score: t.score });
  }

  logger.info(`[TrustScore] Recalculated ${results.length} users`);
  return results;
};

/**
 * Get a single user’s trust score
 */
export const getTrustScoreByUser = async (userId) => {
  const trust = await TrustScore.findOne({ userId });
  if (!trust) throw new Error("TrustScore not found");
  return trust;
};
