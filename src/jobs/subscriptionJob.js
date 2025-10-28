import cron from "node-cron";
import { chargeDueSubscriptions } from "../services/billingService.js";
import logger from "../utils/logger.js";

cron.schedule("0 2 * * *", async () => {
  logger.info("Running daily subscription billing job...");
  await chargeDueSubscriptions();
});
