// src/services/reconciliationService.js
import Transaction from "../models/Transaction.js";
import Escrow from "../models/Escrow.js";
import Booking from "../models/Booking.js";
import ReconciliationReport from "../models/ReconciliationReport.js";
import notificationService from "./notificationService.js";
import logger from "../utils/logger.js";
import adminNotificationService from "./adminNotificationService.js";

/**
 * 🔍 Reconciliation Service
 * - Scans internal DB records to find mismatches that may indicate leakage or stale states.
 * - Generates a ReconciliationReport document with a structured summary.
 * - Notifies admins if any issues are found.
 * - Supports both cron and manual triggers.
 */

const MAX_ISSUES = 500; // Cap the number of issues stored per report

export async function reconcileTransactions({ limit = 5000, runBy = "system" } = {}) {
  const issues = [];
  let txChecked = 0;
  let escrowsChecked = 0;

  logger.info(`🔁 [ReconciliationService] Starting reconciliation (limit=${limit}, runBy=${runBy})`);

  // --- 1️⃣ Check Transactions ---
  const txCursor = Transaction.find({}).cursor();

  for await (const tx of txCursor) {
    if (txChecked >= limit || issues.length >= MAX_ISSUES) break;
    txChecked++;

    try {
      if (!tx.bookingId) {
        issues.push({
          type: "txn_without_booking",
          severity: "high",
          message: "Transaction missing bookingId",
          related: { transactionId: tx._id, amount: tx.amount, status: tx.status },
        });
        continue;
      }

      const booking = await Booking.findById(tx.bookingId).select("_id proId customerId status paymentReleased");
      if (!booking) {
        issues.push({
          type: "txn_booking_missing",
          severity: "high",
          message: "Transaction references a missing booking",
          related: { transactionId: tx._id, bookingId: tx.bookingId },
        });
        continue;
      }

      if (tx.type === "payment" && tx.status === "success") {
        const escrow = await Escrow.findOne({ bookingId: tx.bookingId });
        if (!escrow) {
          issues.push({
            type: "txn_missing_escrow",
            severity: "high",
            message: "Successful payment transaction but no escrow found",
            related: { transactionId: tx._id, bookingId: tx.bookingId },
          });
          continue;
        }

        if (Number(escrow.amountHeld || 0) !== Number(tx.amount || 0)) {
          issues.push({
            type: "amount_mismatch",
            severity: "high",
            message: "Escrow amount differs from transaction amount",
            related: {
              transactionId: tx._id,
              escrowId: escrow._id,
              bookingId: tx.bookingId,
              txnAmount: tx.amount,
              escrowAmount: escrow.amountHeld,
            },
          });
        }

        if (escrow.status === "released" && !booking.paymentReleased) {
          issues.push({
            type: "escrow_released_booking_not_updated",
            severity: "medium",
            message: "Escrow released but booking.paymentReleased still false",
            related: { escrowId: escrow._id, bookingId: booking._id, transactionId: tx._id },
          });
        }
      }
    } catch (err) {
      logger.error("❌ [ReconciliationService] Error checking transaction", { txId: tx._id, error: err });
      issues.push({
        type: "reconcile_error",
        severity: "low",
        message: `Error checking transaction ${tx._id}: ${err.message}`,
        related: { transactionId: tx._id },
      });
    }
  }

  // --- 2️⃣ Check Escrows ---
  const escCursor = Escrow.find({}).cursor();

  for await (const esc of escCursor) {
    if (escrowsChecked >= limit || issues.length >= MAX_ISSUES) break;
    escrowsChecked++;

    try {
      const booking = await Booking.findById(esc.bookingId).select("_id status paymentReleased");
      if (!booking) {
        issues.push({
          type: "escrow_without_booking",
          severity: "high",
          message: "Escrow exists for missing booking",
          related: { escrowId: esc._id, bookingId: esc.bookingId },
        });
        continue;
      }

      const txn = await Transaction.findOne({
        bookingId: esc.bookingId,
        type: "payment",
        status: "success",
      }).sort({ createdAt: -1 });

      if (!txn) {
        issues.push({
          type: "escrow_without_txn",
          severity: "medium",
          message: "Escrow exists but no successful payment transaction found",
          related: { escrowId: esc._id, bookingId: esc.bookingId },
        });
      }
    } catch (err) {
      logger.error("❌ [ReconciliationService] Error checking escrow", { escrowId: esc._id, error: err });
      issues.push({
        type: "reconcile_error",
        severity: "low",
        message: `Error checking escrow ${esc._id}: ${err.message}`,
        related: { escrowId: esc._id },
      });
    }
  }

  // --- 3️⃣ Generate Report ---
  const report = await ReconciliationReport.create({
    runBy,
    summary: {
      totalTransactionsChecked: txChecked,
      totalEscrowsChecked: escrowsChecked,
      totalIssues: issues.length,
    },
    issues: issues.slice(0, MAX_ISSUES),
    meta: { createdAt: new Date() },
  });

  // --- 4️⃣ Notify Admins ---
  if (issues.length > 0) {
    const topIssues = issues.slice(0, 10).map((i) => `${i.type}: ${i.message}`);
    await notificationService.notifyAdmins({
      type: "reconciliation_alert",
      title: `Reconciliation found ${issues.length} issue(s)`,
      message: topIssues.join("\n"),
      meta: { reportId: report._id, totalIssues: issues.length },
    });
    logger.warn("⚠️ [ReconciliationService] Issues detected", {
      reportId: report._id,
      totalIssues: issues.length,
    });

    // ✅ Admin Notification (moved INSIDE function)
    await adminNotificationService.createNotification({
      type: "RECONCILIATION_ISSUE",
      title: "Reconciliation Issues Detected",
      message: `${report.summary.totalIssues} discrepancies found in reconciliation run`,
      severity: report.summary.totalIssues > 10 ? "high" : "medium",
      relatedIds: { reportId: report._id },
      createdBy: runBy || null,
    });
  } else {
    logger.info("✅ [ReconciliationService] Reconciliation completed cleanly", { reportId: report._id });
  }

  return report;
}

/**
 * 📄 Get Recent Reconciliation Reports
 */
export async function getLastReconciliationReports({ limit = 20 } = {}) {
  return ReconciliationReport.find({}).sort({ runAt: -1 }).limit(limit);
}

export default {
  reconcileTransactions,
  getLastReconciliationReports,
};
