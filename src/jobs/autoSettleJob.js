import cron from "node-cron";
import logger from "../utils/logger.js";
import { autoSettlePendingEscrows } from "../services/escrowSettlementService.js";

cron.schedule("0 2 * * *", async () => {
  logger.info("⏰ Running auto-settlement job (2 AM daily)...");
  try {
    await autoSettlePendingEscrows();
    logger.info("✅ Auto-settlement job completed successfully");
  } catch (err) {
    logger.error("❌ Auto-settlement job failed", err);
  }
});
