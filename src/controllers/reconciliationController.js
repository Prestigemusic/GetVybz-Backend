// src/controllers/reconciliationController.js
import reconciliationService from "../services/reconciliationService.js";
import logger from "../utils/logger.js";
import { Parser as Json2CsvParser } from "json2csv";
import Booking from "../models/Booking.js";
import Transaction from "../models/Transaction.js";
import Escrow from "../models/Escrow.js";
import ReconciliationReport from "../models/ReconciliationReport.js";

/**
 * @desc   Get recent reconciliation reports (with filters + pagination)
 * @route  GET /api/admin/reconciliation/reports
 * @access Admin
 */
export const getReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, from, to, hasIssues } = req.query;
    const query = {};

    if (from || to) {
      query.runAt = {};
      if (from) query.runAt.$gte = new Date(from);
      if (to) query.runAt.$lte = new Date(to);
    }

    if (hasIssues === "true") query["summary.totalIssues"] = { $gt: 0 };
    if (hasIssues === "false") query["summary.totalIssues"] = { $eq: 0 };

    const reports = await ReconciliationReport.find(query)
      .sort({ runAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ReconciliationReport.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      results: reports,
    });
  } catch (err) {
    logger.error("getReports error", err);
    res.status(500).json({ success: false, message: "Failed to fetch reconciliation reports" });
  }
};

/**
 * @desc   Run reconciliation manually (escrow ↔ transaction ↔ booking)
 * @route  POST /api/admin/reconciliation/run
 * @access Admin
 */
export const runReconciliation = async (req, res) => {
  try {
    const runBy = req.user?.id || null;

    logger.info("🧾 Manual reconciliation triggered by admin", { runBy });

    const report = await reconciliationService.reconcileTransactions({
      limit: 5000,
      runBy,
      manual: true,
    });

    res.status(201).json({
      success: true,
      message: "Reconciliation completed successfully",
      report,
    });
  } catch (err) {
    logger.error("runReconciliation error", err);
    res.status(500).json({
      success: false,
      message: "Failed to run reconciliation",
      error: err.message,
    });
  }
};

/**
 * @desc   Export reconciliation reports as CSV (flattened issues)
 * @route  GET /api/admin/reconciliation/reports.csv
 * @access Admin
 */
export const exportReportsCSV = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const reports = await reconciliationService.getLastReconciliationReports({ limit });

    const rows = [];
    for (const r of reports) {
      const base = {
        reportId: r._id.toString(),
        runAt: r.runAt,
        runBy: r.runBy ? String(r.runBy) : "",
        totalTransactionsChecked: r.summary?.totalTransactionsChecked || 0,
        totalEscrowsChecked: r.summary?.totalEscrowsChecked || 0,
        totalIssues: r.summary?.totalIssues || 0,
      };

      if (Array.isArray(r.issues) && r.issues.length > 0) {
        for (const iss of r.issues) {
          rows.push({
            ...base,
            issueType: iss.type || "",
            issueSeverity: iss.severity || "",
            issueMessage: iss.message || "",
            related: JSON.stringify(iss.related || {}),
          });
        }
      } else {
        rows.push({
          ...base,
          issueType: "",
          issueSeverity: "",
          issueMessage: "",
          related: "{}",
        });
      }
    }

    const fields = [
      "reportId",
      "runAt",
      "runBy",
      "totalTransactionsChecked",
      "totalEscrowsChecked",
      "totalIssues",
      "issueType",
      "issueSeverity",
      "issueMessage",
      "related",
    ];

    const json2csv = new Json2CsvParser({ fields });
    const csv = json2csv.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(`reconciliation_reports_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    logger.error("exportReportsCSV error", err);
    res.status(500).json({ message: "Failed to export reconciliation CSV" });
  }
};

/**
 * @desc   Get detailed reconciliation data for a specific booking
 * @route  GET /api/admin/reconciliation/details/:bookingId
 * @access Admin
 */
export const getReconciliationDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });

    const booking = await Booking.findById(bookingId)
      .populate("customerId", "firstName lastName email")
      .populate("proId", "firstName lastName email")
      .lean();

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const transactions = await Transaction.find({ bookingId }).sort({ createdAt: -1 }).lean();
    const escrows = await Escrow.find({ bookingId }).sort({ createdAt: -1 }).lean();

    const summary = {
      bookingStatus: booking.status,
      totalTransactions: transactions.length,
      totalEscrows: escrows.length,
      hasPaymentRelease: booking.paymentReleased,
      hasActiveDispute: Boolean(booking.disputeId),
      escrowState: escrows.length > 0 ? [...new Set(escrows.map((e) => e.status))].join(", ") : "none",
    };

    res.json({ booking, transactions, escrows, summary });
  } catch (err) {
    logger.error("getReconciliationDetails error", err);
    res.status(500).json({ message: "Failed to fetch reconciliation details" });
  }
};
