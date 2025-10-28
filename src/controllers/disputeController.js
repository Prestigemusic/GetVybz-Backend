// src/controllers/disputeController.js
import disputeService from "../services/disputeService.js";
import logger from "../utils/logger.js";

/**
 * POST /api/disputes/create
 * Body: { bookingId, reason, description, evidence }
 */
export const createDispute = async (req, res) => {
  try {
    const initiatorId = req.user?.id;
    const { bookingId, reason, description, evidence } = req.body;
    if (!bookingId || !reason) return res.status(400).json({ message: "bookingId and reason are required" });

    const dispute = await disputeService.createDispute({
      bookingId,
      initiatorId,
      reason,
      description,
      evidence,
    });

    res.status(201).json({ success: true, dispute });
  } catch (err) {
    logger.error("createDispute error", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/disputes/:id/evidence
 * Body: { type, url, note }
 */
export const addEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const uploadedBy = req.user?.id;
    const { type, url, note } = req.body;
    const updated = await disputeService.addEvidence(id, { uploadedBy, type, url, note });
    res.json({ success: true, dispute: updated });
  } catch (err) {
    logger.error("addEvidence error", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/disputes/:id/resolve
 * Body: { resolution, resolutionNote, split }
 * Admin only route expected
 */
export const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const resolvedBy = req.user?.id;
    const { resolution, resolutionNote, split, performEscrowAction } = req.body;

    if (!resolution) return res.status(400).json({ message: "resolution is required" });

    const dispute = await disputeService.resolveDispute(id, {
      resolvedBy,
      resolution,
      resolutionNote,
      split,
      performEscrowAction: performEscrowAction !== false, // default true
    });

    res.json({ success: true, dispute });
  } catch (err) {
    logger.error("resolveDispute error", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/disputes/mine
 * Returns disputes where the user is initiator or respondent
 */
export const myDisputes = async (req, res) => {
  try {
    const userId = req.user?.id;
    const data = await disputeService.findDisputes({ userId, limit: 100 });
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error("myDisputes error", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/disputes/:id
 */
export const getDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const d = await disputeService.getDisputeById(id);
    res.json({ success: true, dispute: d });
  } catch (err) {
    logger.error("getDispute error", err);
    res.status(404).json({ success: false, message: err.message });
  }
};

export default {
  createDispute,
  addEvidence,
  resolveDispute,
  myDisputes,
  getDispute,
};
