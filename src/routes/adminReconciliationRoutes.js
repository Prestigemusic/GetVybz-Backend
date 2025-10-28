// src/routes/adminReconciliationRoutes.js
import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import adminReconciliationController from "../controllers/adminReconciliationController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();

/**
 * @route   GET /api/admin/reconciliation/reports
 * @desc    Fetch summarized reconciliation reports (escrow vs transactions)
 * @access  Admin only
 */
router.get(
  "/reports",
  protect,
  requireRole("admin"),
  asyncHandler(adminReconciliationController.getReports)
);

/**
 * @route   POST /api/admin/reconciliation/run
 * @desc    Run reconciliation check manually (Escrow ↔ Transaction ↔ Booking)
 * @access  Admin only
 */
router.post(
  "/run",
  protect,
  requireRole("admin"),
  asyncHandler(adminReconciliationController.runReconciliation)
);

/**
 * @route   GET /api/admin/reconciliation/details/:bookingId
 * @desc    Fetch detailed reconciliation info for a specific booking
 * @access  Admin only
 */
router.get(
  "/details/:bookingId",
  protect,
  requireRole("admin"),
  asyncHandler(adminReconciliationController.getReconciliationDetails)
);

/**
 * @route   GET /api/admin/reconciliation/reports.csv
 * @desc    Export reconciliation reports (flattened issues) as downloadable CSV
 * @access  Admin only
 */
router.get(
  "/reports.csv",
  protect,
  requireRole("admin"),
  asyncHandler(adminReconciliationController.exportReportsCSV)
);

export default router;
