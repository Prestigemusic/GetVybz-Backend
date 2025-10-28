// src/routes/adminDisputeRoutes.js
import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import adminDisputeController from "../controllers/adminDisputeController.js";

const router = express.Router();

/**
 * Admin-only dispute management routes
 * Base path suggestion: /api/admin/disputes
 * 
 * These endpoints are protected with both authentication and role authorization.
 * Each route is documented with its method, path, and purpose.
 */

// GET /api/admin/disputes
// → List all disputes with optional filters (status, user, date range)
router.get(
  "/",
  protect,
  requireRole("admin"),
  adminDisputeController.adminListDisputes
);

// GET /api/admin/disputes/stats
// → Get dispute status breakdown (open, resolved, dismissed, etc.)
router.get(
  "/stats",
  protect,
  requireRole("admin"),
  adminDisputeController.adminDisputeStats
);

// GET /api/admin/disputes/:id
// → Fetch a specific dispute by ID with populated details
router.get(
  "/:id",
  protect,
  requireRole("admin"),
  adminDisputeController.adminGetDispute
);

// PUT /api/admin/disputes/:id/transition
// → Move dispute between states (open → under_review → in_mediation, etc.)
router.put(
  "/:id/transition",
  protect,
  requireRole("admin"),
  adminDisputeController.adminTransitionDispute
);

// PUT /api/admin/disputes/:id/resolve
// → Apply a resolution (refund, release, dismissed, penalty)
router.put(
  "/:id/resolve",
  protect,
  requireRole("admin"),
  adminDisputeController.adminResolveDispute
);

export default router;
