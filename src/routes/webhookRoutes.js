// src/routes/webhookRoutes.js
import express from "express";
import crypto from "crypto";
import asyncHandler from "express-async-handler";
import bodyParser from "body-parser";
import { logger } from "../utils/logger.js";

const router = express.Router();

// We need raw body for Paystack signature validation
router.post(
  "/paystack",
  bodyParser.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      const signature = req.headers["x-paystack-signature"];

      // Compute hash using the *raw* buffer
      const computedHash = crypto
        .createHmac("sha512", secret)
        .update(req.body)
        .digest("hex");

      // Compare signatures
      if (computedHash !== signature) {
        logger.warn("⚠️ Invalid Paystack webhook signature");
        return res.status(400).json({ error: "Invalid signature" });
      }

      // Parse body only after signature is verified
      const event = JSON.parse(req.body.toString("utf8"));

      logger.info(`✅ Valid Paystack webhook received: ${event.event}`);
      logger.debug(JSON.stringify(event, null, 2));

      // TODO: Handle event logic here (charge.success, transfer.success, etc.)
      res.status(200).json({ success: true, message: "Webhook received" });
    } catch (err) {
      logger.error("❌ Paystack webhook handler error:", err);
      res.status(500).json({ error: err.message });
    }
  })
);

export default router;
