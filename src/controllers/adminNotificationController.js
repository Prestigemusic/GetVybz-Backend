import adminNotificationService from "../services/adminNotificationService.js";
import logger from "../utils/logger.js";

/**
 * @route   GET /api/admin/notifications
 * @access  Admin
 */
export const getNotifications = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const unread = await adminNotificationService.getUnreadNotifications(Number(limit));
    res.json({ success: true, notifications: unread });
  } catch (err) {
    logger.error("getNotifications error", err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

/**
 * @route   PATCH /api/admin/notifications/:id/read
 * @access  Admin
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await adminNotificationService.markAsRead(id);
    res.json({ success: true, notification: updated });
  } catch (err) {
    logger.error("markNotificationRead error", err);
    res.status(500).json({ success: false, message: "Failed to mark notification as read" });
  }
};

export default {
  getNotifications,
  markNotificationRead,
};
