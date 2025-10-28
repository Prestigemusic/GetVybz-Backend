import cron from "node-cron";
import logger from "../utils/logger.js";
import reconciliationService from "../services/reconciliationService.js";
import notificationService from "../services/notificationService.js";

/**
 * Nightly reconciliation job
 * Schedule: daily at 03:00 AM server time
 * You can also call runReconciliationNow() manually.
 */
cron.schedule("0 3 * * *", async () => {
  logger.info("🔁 Running nightly reconciliation job");

  try {
    const report = await reconciliationService.reconcileTransactions({ limit: 5000, runBy: null });
    logger.info("🔁 Reconciliation job finished", {
      reportId: report._id,
      issues: report.summary.totalIssues,
    });

    // Notify admins if issues were found
    if (report.summary.totalIssues > 0) {
      await notificationService.sendToAdmins({
        title: "⚠️ Reconciliation Issues Detected",
        message: `Nightly reconciliation completed with ${report.summary.totalIssues} issue(s).`,
        data: {
          reportId: report._id,
          summary: report.summary,
          timestamp: report.runAt,
        },
        type: "system_alert",
        severity: "high",
      });
      logger.info("📢 Admins notified about reconciliation issues.");
    } else {
      // Optional: Notify admins of a clean report (can disable if too noisy)
      await notificationService.sendToAdmins({
        title: "✅ Reconciliation Successful",
        message: "Nightly reconciliation completed with no issues detected.",
        data: {
          reportId: report._id,
          summary: report.summary,
          timestamp: report.runAt,
        },
        type: "system_alert",
        severity: "low",
      });
      logger.info("📢 Admins notified of clean reconciliation report.");
    }
  } catch (err) {
    logger.error("❌ Reconciliation job failed", err);

    // Notify admins on job failure
    try {
      await notificationService.sendToAdmins({
        title: "🚨 Reconciliation Job Failed",
        message: `The nightly reconciliation process encountered an error: ${err.message}`,
        data: { stack: err.stack, timestamp: new Date() },
        type: "system_alert",
        severity: "critical",
      });
    } catch (notifyErr) {
      logger.error("⚠️ Failed to send admin failure notification", notifyErr);
    }
  }
});

/**
 * Manual trigger for reconciliation (used by admin API or scripts)
 */
export async function runReconciliationNow(options = {}) {
  const report = await reconciliationService.reconcileTransactions(options);

  // Optional: also notify admins when triggered manually
  try {
    await notificationService.sendToAdmins({
      title: "🧾 Manual Reconciliation Run Completed",
      message: `Manual reconciliation run finished with ${report.summary.totalIssues} issue(s).`,
      data: {
        reportId: report._id,
        summary: report.summary,
        runBy: options.runBy || "system",
      },
      type: "system_alert",
    });
  } catch (err) {
    logger.warn("⚠️ Could not send manual reconciliation notification", err);
  }

  return report;
}

export default {
  runReconciliationNow,
};
