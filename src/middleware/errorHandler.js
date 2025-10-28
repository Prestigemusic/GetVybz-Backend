// backend/src/middleware/errorHandler.js

/**
 * Central error handler for Express
 * Usage: app.use(errorHandler) as the last middleware
 */
const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  // Minimal error shaping
  const payload = {
    success: false,
    error: {
      message,
      code: err.code || null,
    },
  };

  // Add stack trace only in development
  if (process.env.NODE_ENV !== "production") {
    payload.error.stack = err.stack;
  }

  // Log to console
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, err.stack || "");

  res.status(status).json(payload);
};

// ✅ Proper default export
export default errorHandler;
