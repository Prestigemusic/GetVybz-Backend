// src/controllers/adminDisputeController.js
import disputeService from "../services/disputeService.js";
import logger from "../utils/logger.js";

/**
 * Admin: list disputes with filters & pagination
 * GET /api/admin/disputes
 */
export const adminListDisputes = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, raisedBy, against, fromDate, toDate } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (raisedBy) filters.raisedBy = raisedBy;
    if (against) filters.against = against;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const result = await disputeService.listDisputes({ page: Number(page), limit: Number(limit), filters });
    res.json(result);
  } catch (err) {
    logger.error("adminListDisputes error", err);
    res.status(500).json({ message: "Failed to list disputes" });
  }
};

/**
 * Admin: get dispute by id
 * GET /api/admin/disputes/:id
 */
export const adminGetDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const dispute = await disputeService.getDisputeById(id);
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });
    res.json(dispute);
  } catch (err) {
    logger.error("adminGetDispute error", err);
    res.status(500).json({ message: "Failed to fetch dispute" });
  }
};

/**
 * Admin: transition dispute state (e.g. under_review, in_mediation)
 * PUT /api/admin/disputes/:id/transition
 * body: { targetState, notes }
 */
export const adminTransitionDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetState, notes } = req.body;
    const actorId = req.user.id;

    const dispute = await disputeService.transitionDispute({ disputeId: id, actorId, targetState, notes });
    res.json(dispute);
  } catch (err) {
    logger.error("adminTransitionDispute error", err);
    res.status(400).json({ message: err.message || "Failed to transition dispute" });
  }
};

/**
 * Admin: resolve dispute (apply resolution)
 * PUT /api/admin/disputes/:id/resolve
 * body: { resolution, notes, options }
 */
export const adminResolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, notes, options } = req.body;
    const actorId = req.user.id;

    // workflow: move to 'resolved' with resolution
    const dispute = await disputeService.transitionDispute({
      disputeId: id,
      actorId,
      targetState: "resolved",
      resolution,
      notes,
      options,
    });

    res.json(dispute);
  } catch (err) {
    logger.error("adminResolveDispute error", err);
    res.status(400).json({ message: err.message || "Failed to resolve dispute" });
  }
};

/**
 * Admin: quick stats
 * GET /api/admin/disputes/stats
 */
export const adminDisputeStats = async (req, res) => {
  try {
    const stats = await disputeService.getDisputeStats();
    res.json(stats);
  } catch (err) {
    logger.error("adminDisputeStats error", err);
    res.status(500).json({ message: "Failed to get dispute stats" });
  }
};

export default {
  adminListDisputes,
  adminGetDispute,
  adminTransitionDispute,
  adminResolveDispute,
  adminDisputeStats,
};
