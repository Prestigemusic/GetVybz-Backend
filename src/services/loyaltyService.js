// src/services/loyaltyService.js
import User from "../models/User.js";
import logger from "../utils/logger.js";

const tierThresholds = {
  Bronze: 0,
  Silver: 500,
  Gold: 1500,
  Platinum: 3000
};

// Add points and auto-update tier
export const addPoints = async (userId, points, reason = "") => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.points += points;

  const tiers = Object.keys(tierThresholds).reverse(); // Platinum -> Bronze
  for (const t of tiers) {
    if (user.points >= tierThresholds[t]) {
      user.tier = t;
      break;
    }
  }

  await user.save();
  logger.info(`💎 Added ${points} points to ${userId} (${reason}), new tier: ${user.tier}`);
  return user;
};

// Grant badge
export const grantBadge = async (userId, badge) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (!user.badges.includes(badge)) {
    user.badges.push(badge);
    await user.save();
    logger.info(`🏅 Badge "${badge}" granted to ${userId}`);
  }
  return user;
};
