// src/services/reviewService.js
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { recalcTrustScoreJob } from "../jobs/trustScoreJob.js";
import { settleEscrow } from "./escrowSettlementService.js";
import { handleReviewSubmission } from "./loyaltyHooks.js";

/**
 * Create a review (Customer→Pro or Pro→Customer)
 */
export const createReview = async ({ bookingId, reviewerId, rating, comment }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  if (booking.status !== "completed") {
    throw new Error("You can only review after booking completion");
  }

  let reviewerRole, targetId, targetRole;

  if (booking.customerId.toString() === reviewerId.toString()) {
    reviewerRole = "customer";
    targetId = booking.proId;
    targetRole = "pro";
  } else if (booking.proId.toString() === reviewerId.toString()) {
    reviewerRole = "pro";
    targetId = booking.customerId;
    targetRole = "customer";
  } else {
    throw new Error("You are not a participant in this booking");
  }

  // Prevent duplicate reviews
  const existing = await Review.findOne({ bookingId, reviewerId, targetId });
  if (existing) throw new Error("You have already submitted a review for this booking");

  // ✅ Create review
  const review = await Review.create({
    bookingId,
    reviewerId,
    targetId,
    reviewerRole,
    targetRole,
    rating,
    comment,
  });

  // Update target’s rating & reviewCount
  const stats = await Review.aggregate([
    { $match: { targetId } },
    { $group: { _id: "$targetId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const avgRating = stats[0]?.avgRating || rating;
  const reviewCount = stats[0]?.count || 1;

  await User.findByIdAndUpdate(targetId, { rating: avgRating, reviewCount });

  logger.info("✅ Review created and target rating updated", { targetId, avgRating, reviewCount });

  // Mark booking review status
  if (reviewerRole === "customer") booking.customerReviewed = true;
  if (reviewerRole === "pro") booking.proReviewed = true;
  await booking.save();

  // Trigger Trust Score recalculation
  try {
    await recalcTrustScoreJob(targetId);
    await recalcTrustScoreJob(reviewerId);
    logger.info(`🔁 Trust Score recalculated for ${targetId} and ${reviewerId}`);
  } catch (err) {
    logger.error("Trust Score recalculation failed after review", err);
  }

  // Gamification: award points/badges for review
  try {
    await handleReviewSubmission({ reviewerId, targetId, rating });
    logger.info("🏆 Gamification points awarded for review submission");
  } catch (err) {
    logger.warn("Gamification hook failed for review submission", err);
  }

  // Attempt escrow release
  try {
    await settleEscrow(booking._id);
  } catch (err) {
    logger.warn(`Escrow release skipped for booking ${booking._id}: ${err.message}`);
  }

  return review;
};

export const getUserReviews = async (userId, { limit = 20 } = {}) => {
  return Review.find({ targetId: userId })
    .populate("reviewerId", "name email role")
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const getProReviews = async (proId, { limit = 20 } = {}) => {
  return getUserReviews(proId, { limit });
};
