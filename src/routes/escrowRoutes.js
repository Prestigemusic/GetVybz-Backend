// src/routes/escrowRoutes.js
import express from "express";
import escrowService from "../services/escrowService.js";
import logger from "../utils/logger.js";
import { protect } from "../middleware/authMiddleware.js"; // adjust path if needed

const router = express.Router();

/**
 * POST /api/escrow/initiate
 * Body: { bookingId, amount, email, gateway } - gateway optional: 'paystack'|'flutterwave'
 * Auth: protect (customer)
 */
router.post("/initiate", protect, async (req, res) => {
  try {
    const { bookingId, amount, email, gateway = escrowService.GATEWAYS.PAYSTACK, metadata = {} } = req.body;
    if (!bookingId || !amount || !email) {
      return res.status(400).json({ success: false, message: "bookingId, amount and email are required" });
    }

    const result = await escrowService.initializeEscrow({ bookingId, amount, email, gateway, metadata });
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Escrow initiate error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/escrow/release/:bookingId
 * Auth: protect (admin or system user ideally)
 * Body: { note }
 */
router.post("/release/:bookingId", protect, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const initiatedBy = req.user?._id || null; // protect must set req.user
    const note = req.body.note || "";

    const result = await escrowService.releaseFunds({ bookingId, initiatedBy, note });
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Escrow release error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/escrow/refund/:bookingId
 * Auth: protect (admin or authorized agent)
 * Body: { reason }
 */
router.post("/refund/:bookingId", protect, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const initiatedBy = req.user?._id || null;
    const reason = req.body.reason || "";

    const result = await escrowService.refundFunds({ bookingId, initiatedBy, reason });
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Escrow refund error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/escrow/webhook/paystack
 * Paystack requires raw body for signature verification. This route expects the server to configure
 * express.raw({ type: 'application/json' }) for this path (see index.js snippet below).
 *
 * Public endpoint (no auth).
 */
router.post("/webhook/paystack", async (req, res) => {
  try {
    // For raw body, req.body may be a Buffer/string; parse if necessary.
    // If using express.raw middleware, body will be a Buffer; convert to string then JSON.
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString("utf8"));
      } catch (e) {
        // If parse fails, forward raw body as-is (escrowService.verifyWebhook handles checks)
      }
    }

    const headers = req.headers;
    const result = await escrowService.handleWebhook({ headers, body, gateway: escrowService.GATEWAYS.PAYSTACK });
    // respond 200 quickly to acknowledge receipt; gateway will retry on non-2xx
    return res.status(200).json(result);
  } catch (err) {
    logger.error("Paystack webhook processing error", err);
    // Always return 200 to avoid repeated retries unless you intentionally want gateway retries.
    return res.status(200).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/escrow/webhook/flutterwave
 * Flutterwave webhook also needs a raw body for verification headers.
 *
 * Public endpoint (no auth).
 */
router.post("/webhook/flutterwave", async (req, res) => {
  try {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString("utf8"));
      } catch (e) {}
    }

    const headers = req.headers;
    const result = await escrowService.handleWebhook({ headers, body, gateway: escrowService.GATEWAYS.FLUTTERWAVE });
    return res.status(200).json(result);
  } catch (err) {
    logger.error("Flutterwave webhook processing error", err);
    return res.status(200).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/escrow/:bookingId
 * Auth: protect
 * Returns escrow + recent transactions for the booking
 */
router.get("/:bookingId", protect, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const data = await escrowService.getEscrowDetails(bookingId);
    return res.json({ success: true, data });
  } catch (err) {
    logger.error("Escrow details error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
