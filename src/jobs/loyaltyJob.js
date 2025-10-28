// src/jobs/loyaltyJob.js
import cron from "node-cron";
import User from "../models/User.js";
import { addPoints } from "../services/loyaltyService.js";
import logger from "../utils/logger.js";

export const recalcTiersJob = () => {
  cron.schedule("0 0 * * 0", async () => { // every Sunday at 00:00
    try {
      const users = await User.find({});
      for (const user of users) {
        // trigger tier recalculation without adding points
        await addPoints(user._id, 0, "Weekly tier recalculation");
      }
      logger.info("🗓️ Weekly Loyalty Tier Recalculation complete");
    } catch (err) {
      logger.error("Error in Weekly Loyalty Job", err);
    }
  });
};
