// backend/src/cron/monetization.js
import cron from "node-cron";
import User from "../models/User.js";

/**
 * Runs a daily cleanup job to:
 * 1. Reset expired Boosts
 * 2. Reset expired Subscriptions
 *
 * Exported as a named function `scheduleMonetizationCleanup`
 * so it can be imported and called from index.js
 */

export function scheduleMonetizationCleanup() {
  // Run at midnight daily
  cron.schedule("0 0 * * *", async () => {
    console.log("🕛 Running daily monetization cleanup...");
    const now = new Date();

    try {
      // Expired boosts
      const boostResult = await User.updateMany(
        { boostExpiry: { $lt: now }, isBoosted: true },
        { $set: { isBoosted: false, boostExpiry: null } }
      );

      // Expired subscriptions
      const subResult = await User.updateMany(
        { subscriptionExpiry: { $lt: now }, subscriptionActive: true },
        { $set: { subscriptionActive: false, subscriptionExpiry: null } }
      );

      console.log(`✅ Boosts reset: ${boostResult.modifiedCount}`);
      console.log(`✅ Subscriptions reset: ${subResult.modifiedCount}`);
    } catch (err) {
      console.error("❌ Error running monetization cleanup:", err);
    }
  });

  console.log("🗓️ Monetization cleanup cron job scheduled.");
}
