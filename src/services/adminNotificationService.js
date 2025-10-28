// src/services/adminNotificationService.js
import AdminNotification from "../models/AdminNotification.js";
import logger from "../utils/logger.js";
import { io } from "../config/socket.js"; // already initialized in your server

/**
 * Create a new admin notification (base method)
 */
export async function createNotification(data) {
  try {
    const notification = await AdminNotification.create(data);

    // Real-time emit (optional)
    if (io) {
      io.emit("admin_notification", notification);
    }

    logger.info("📢 Admin notification created", {
      type: data.type,
      severity: data.severity,
    });

    return notification;
  } catch (err) {
    logger.error("Failed to create admin notification", err);
  }
}

/**
 * Alias for backward compatibility
 * Used by trustScoreService, disputeService, reconciliationService
 */
export async function notifyAdmin(title, message, meta = {}) {
  return createNotification({
    type: meta?.type || "general",
    title,
    message,
    severity: meta?.severity || "medium",
    relatedIds: meta?.relatedIds || {},
    createdBy: meta?.createdBy || null,
  });
}

/**
 * Fetch unread notifications
 */
export async function getUnreadNotifications(limit = 50) {
  return AdminNotification.find({ read: false })
    .sort({ createdAt: -1 })
    .limit(limit);
}

/**
 * Mark an admin notification as read
 */
export async function markAsRead(id) {
  return AdminNotification.findByIdAndUpdate(id, { read: true }, { new: true });
}

export default {
  createNotification,
  notifyAdmin, // added for backward compatibility
  getUnreadNotifications,
  markAsRead,
};
