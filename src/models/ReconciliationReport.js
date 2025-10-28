// src/models/ReconciliationReport.js
import mongoose from "mongoose";

/**
 * Stores results of a reconciliation run.
 * - summary: counts & high-level stats
 * - issues: array of discovered mismatches (capped)
 * - runBy: user/admin who triggered it (null for automatic)
 */
const ReconciliationReportSchema = new mongoose.Schema(
  {
    runBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    runAt: { type: Date, default: Date.now },
    summary: {
      totalTransactionsChecked: { type: Number, default: 0 },
      totalEscrowsChecked: { type: Number, default: 0 },
      totalIssues: { type: Number, default: 0 },
    },
    issues: [
      {
        type: { type: String }, // e.g., "missing_escrow", "txn_without_booking", "amount_mismatch"
        severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
        message: { type: String },
        related: { type: Object, default: {} }, // e.g. { transactionId, escrowId, bookingId, amount, status }
      },
    ],
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

ReconciliationReportSchema.index({ runAt: -1 });

const ReconciliationReport =
  mongoose.models.ReconciliationReport || mongoose.model("ReconciliationReport", ReconciliationReportSchema);

export default ReconciliationReport;
