// src/jobs/loyaltyCronJob.js
import cron from "node-cron";
import User from "../models/User.js";
import { addPoints } from "../services/loyaltyService.js";
import logger from "../utils/logger.js";

export const recalcTiersCron = () => {
  // Run every Sunday 00:00
  cron.schedule("0 0 * * 0", async () => {
    logger.info("🔁 Starting weekly tier recalculation...");

    const users = await User.find();
    for (const user of users) {
      // Reapply tier logic
      await addPoints(user._id, 0, "Weekly Tier Recalculation");
    }

    logger.info("✅ Weekly tier recalculation complete");
  });
};
