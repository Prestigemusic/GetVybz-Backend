// src/routes/adminNotificationRoutes.js
import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import adminNotificationService from "../services/adminNotificationService.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * @route   GET /api/admin/notifications
 * @desc    Get all admin notifications (optionally filtered)
 * @access  Admin only
 */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { unread, limit = 50, page = 1 } = req.query;
    const filters = {};

    if (unread === "true") filters.isRead = false;

    const notifications = await adminNotificationService.getAllNotifications({
      filters,
      limit: Number(limit),
      page: Number(page),
    });

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    logger.error("❌ Error fetching admin notifications:", err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

/**
 * @route   PATCH /api/admin/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Admin only
 */
router.patch("/:id/read", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await adminNotificationService.markAsRead(id);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification marked as read", data: notification });
  } catch (err) {
    logger.error("❌ Error marking admin notification as read:", err);
    res.status(500).json({ success: false, message: "Failed to mark notification as read" });
  }
});

/**
 * @route   PATCH /api/admin/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Admin only
 */
router.patch("/read-all", protect, adminOnly, async (req, res) => {
  try {
    const result = await adminNotificationService.markAllAsRead();
    res.status(200).json({ success: true, message: "All notifications marked as read", data: result });
  } catch (err) {
    logger.error("❌ Error marking all notifications as read:", err);
    res.status(500).json({ success: false, message: "Failed to mark all notifications as read" });
  }
});

/**
 * @route   DELETE /api/admin/notifications/:id
 * @desc    Delete a notification
 * @access  Admin only
 */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminNotificationService.deleteNotification(id);

    if (!result) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (err) {
    logger.error("❌ Error deleting admin notification:", err);
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
});

export default router;
