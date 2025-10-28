import cron from "node-cron";
import { chargeDueSubscriptions } from "../services/billingService.js";
import { recalcTrustScoreJob } from "./trustScoreJob.js";
import Booking from "../models/Booking.js";
import logger from "../utils/logger.js";

/**
 * Background Jobs Scheduler
 */
export const startBackgroundJobs = () => {
  logger.info("✅ Starting background jobs...");

  // ---------------- Charge Due Subscriptions ----------------
  // Runs daily at 1:00 AM
  cron.schedule("0 1 * * *", async () => {
    logger.info("💳 Running chargeDueSubscriptions job...");
    try {
      await chargeDueSubscriptions();
      logger.info("💳 chargeDueSubscriptions job completed successfully");
    } catch (err) {
      logger.error("💳 chargeDueSubscriptions job failed", err);
    }
  });

  // ---------------- TFBS Recalculation ----------------
  // Runs every day at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    logger.info("🔁 Running TFBS recalculation job...");
    try {
      // Recalculate for all users
      const users = await Booking.distinct("customerId");
      for (let userId of users) {
        try {
          await recalcTrustScoreJob(userId);
        } catch (err) {
          logger.error(`TFBS recalculation failed for user ${userId}`, err);
        }
      }
      logger.info("🔁 TFBS recalculation completed");
    } catch (err) {
      logger.error("TFBS job failed", err);
    }
  });

  // ---------------- Stale Booking Cleanup ----------------
  // Runs every hour
  cron.schedule("0 * * * *", async () => {
    logger.info("🧹 Running stale booking cleanup job...");
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h old pending bookings

      const staleBookings = await Booking.updateMany(
        { status: "pending", createdAt: { $lt: cutoff } },
        { status: "cancelled" }
      );

      logger.info(`🧹 Stale booking cleanup completed: ${staleBookings.nModified} bookings cancelled`);
    } catch (err) {
      logger.error("🧹 Stale booking cleanup failed", err);
    }
  });
};
