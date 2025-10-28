// src/services/notificationService.js
import logger from "../utils/logger.js";
import Notification from "../models/Notification.js"; // optional model (recommended)
import { io } from "../config/socket.js"; // centralized socket instance

/**
 * Centralized Notification Service
 * Handles in-app, socket, and future email/push notifications.
 */
const notificationService = {
  /**
   * Save a notification and optionally emit in real-time.
   * @param {Object} payload - { userId, type, title, message, meta, emit }
   */
  async sendNotification({
    userId,
    type = "general",
    title,
    message,
    meta = {},
    emit = true,
  }) {
    try {
      // 1️⃣ Persist notification in DB (optional)
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        meta,
        read: false,
      });

      // 2️⃣ Emit via Socket.IO (if user connected)
      if (emit && io) {
        io.to(userId.toString()).emit("notification", {
          id: notification._id,
          type,
          title,
          message,
          meta,
          createdAt: notification.createdAt,
        });
      }

      logger.info(`🔔 Notification sent to user ${userId}: ${title}`);
      return notification;
    } catch (err) {
      logger.error("❌ Error sending notification:", err.message);
      return null;
    }
  },

  /**
   * Notify all admins (useful for disputes, high-value transactions, etc.)
   */
  async notifyAdmins({ type, title, message, meta = {} }) {
    try {
      const admins = await Notification.db.model("User").find({ role: "admin" });
      const results = await Promise.all(
        admins.map((admin) =>
          this.sendNotification({
            userId: admin._id,
            type,
            title,
            message,
            meta,
            emit: true,
          })
        )
      );
      logger.info(`📢 Admins notified: ${admins.length}`);
      return results;
    } catch (err) {
      logger.error("⚠️ Failed to notify admins:", err.message);
      return [];
    }
  },

  /**
   * Broadcast system-wide (optional utility)
   */
  async broadcast({ type, title, message, meta = {} }) {
    try {
      if (io) {
        io.emit("system_notification", { type, title, message, meta });
        logger.info("📡 System-wide notification broadcasted");
      }
    } catch (err) {
      logger.error("⚠️ Broadcast failed:", err.message);
    }
  },
};

export default notificationService;
