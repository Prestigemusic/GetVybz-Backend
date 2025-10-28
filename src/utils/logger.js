// backend/src/utils/logger.js

/**
 * Simple centralized logger utility for GetVybz backend
 * Automatically prefixes messages with timestamps and levels
 */

const logger = {
  info: (...args) => {
    console.log(`[INFO] ${new Date().toISOString()} -`, ...args);
  },

  warn: (...args) => {
    console.warn(`[WARN] ${new Date().toISOString()} -`, ...args);
  },

  error: (...args) => {
    console.error(`[ERROR] ${new Date().toISOString()} -`, ...args);
  },

  debug: (...args) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[DEBUG] ${new Date().toISOString()} -`, ...args);
    }
  },
};

export default logger;
