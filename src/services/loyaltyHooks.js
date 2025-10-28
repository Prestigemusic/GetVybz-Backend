import User from "../models/User.js";
import logger from "../utils/logger.js";

/**
 * Handle points, badges, tiers after a review
 */
export const handleReviewSubmission = async ({ reviewerId, targetId, rating }) => {
  const reviewer = await User.findById(reviewerId);
  if (!reviewer) throw new Error("Reviewer not found");

  reviewer.loyaltyPoints = (reviewer.loyaltyPoints || 0) + 10; // example: 10 pts per review
  reviewer.badges = reviewer.badges || [];
  if (!reviewer.badges.includes("Reviewer")) reviewer.badges.push("Reviewer");

  // Tier example
  if (reviewer.loyaltyPoints >= 100) reviewer.tier = "Gold";
  else if (reviewer.loyaltyPoints >= 50) reviewer.tier = "Silver";
  else reviewer.tier = "Bronze";

  await reviewer.save();
  logger.info(`🏅 Loyalty updated for reviewer ${reviewerId}`);
};

/**
 * Handle referral bonus
 */
export const handleReferral = async (referrerId, newUserId) => {
  const referrer = await User.findById(referrerId);
  if (!referrer) throw new Error("Referrer not found");

  referrer.loyaltyPoints = (referrer.loyaltyPoints || 0) + 50; // example: 50 pts per referral
  referrer.referralsCount = (referrer.referralsCount || 0) + 1;

  await referrer.save();
  logger.info(`🎉 Referral bonus awarded to ${referrerId} for referring ${newUserId}`);
};
