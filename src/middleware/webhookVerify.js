import crypto from "crypto";
import logger from "../utils/logger.js";

/**
 * Middleware to verify incoming webhook signatures
 * @param {string} secret - webhook secret key from payment gateway
 */
export const verifyWebhook = (secret) => {
  return (req, res, next) => {
    try {
      const signature = req.headers["x-signature"] || req.headers["x-pay-signature"];
      if (!signature) {
        logger.warn("Webhook missing signature");
        return res.status(400).json({ message: "Missing webhook signature" });
      }

      const payload = JSON.stringify(req.body);
      const computedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      if (signature !== computedSignature) {
        logger.warn("Webhook signature mismatch", { payload, signature, computedSignature });
        return res.status(401).json({ message: "Invalid webhook signature" });
      }

      next();
    } catch (err) {
      logger.error("Webhook verification failed", err);
      res.status(500).json({ message: "Webhook verification error" });
    }
  };
};
