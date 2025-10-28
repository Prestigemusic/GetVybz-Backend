import logger from "../utils/logger.js";

// Simple in-memory idempotency store (can be replaced with Redis for production)
const processedKeys = new Map();

/**
 * Middleware to prevent duplicate webhook / API processing
 */
export const idempotency = (req, res, next) => {
  try {
    const key = req.headers["idempotency-key"];
    if (!key) {
      return res.status(400).json({ message: "Missing Idempotency-Key header" });
    }

    if (processedKeys.has(key)) {
      logger.warn("Duplicate webhook detected", { key });
      return res.status(200).json({ message: "Duplicate request ignored" });
    }

    // Mark key as processed (expires after 1 hour)
    processedKeys.set(key, Date.now());
    setTimeout(() => processedKeys.delete(key), 3600 * 1000);

    next();
  } catch (err) {
    logger.error("Idempotency middleware failed", err);
    res.status(500).json({ message: "Idempotency check failed" });
  }
};
