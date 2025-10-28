import cron from "node-cron";
import logger from "../utils/logger.js";
import User from "../models/User.js";
import { calculateTrustScore } from "../services/trustScoreService.js";

/**
 * Recalculate TFBS for all users (or subset) with batching.
 * @param {Object} options
 * @param {number} options.limit - max users per run
 */
export async function recalcAllTrustScores({ limit = 1000 } = {}) {
  const cursor = User.find({ role: { $in: ["pro", "customer"] } }).cursor();
  let processed = 0;
  let errors = 0;

  for await (const user of cursor) {
    try {
      await calculateTrustScore(user._id);
      processed++;
      if (processed >= limit) break;
    } catch (err) {
      errors++;
      logger.error("TFBS recalculation error for user", user._id, err);
    }
  }

  logger.info("TFBS batch recalculation complete", { processed, errors });
  return { processed, errors };
}

/**
 * Schedule: nightly at 01:00 AM server time
 */
cron.schedule("0 1 * * *", async () => {
  logger.info("🔁 Running nightly TFBS recalculation");
  try {
    const res = await recalcAllTrustScores();
    logger.info("🔁 Nightly TFBS job finished", res);
  } catch (err) {
    logger.error("Nightly TFBS job failed", err);
  }
});

/**
 * On-demand TFBS recalculation for a single user (can be called from events)
 */
export async function recalcTrustScoreJob(userId) {
  try {
    const rec = await calculateTrustScore(userId);
    logger.info("🔁 TFBS recalculated for user", userId);
    return rec;
  } catch (err) {
    logger.error("TFBS recalculation failed for user", userId, err);
    throw err;
  }
}
