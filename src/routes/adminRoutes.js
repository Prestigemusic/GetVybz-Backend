import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminProtect } from "../middleware/adminProtect.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { detectAnomalies } from "../services/leakageMonitor.js";

const router = express.Router();

// Middleware: protect + admin
router.use(protect, adminProtect);

/**
 * GET /api/admin/disputes
 * List all bookings with disputes
 */
router.get("/disputes", async (req, res) => {
  try {
    const disputes = await Booking.find({ dispute: { $exists: true, $ne: null } })
      .populate("customerId", "name email")
      .populate("proId", "name email")
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: disputes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch disputes" });
  }
});

/**
 * GET /api/admin/anomalies
 * Run anomaly detection for all active bookings
 */
router.get("/anomalies", async (req, res) => {
  try {
    const activeBookings = await Booking.find({ status: { $in: ["completed", "pending"] } });

    const results = [];
    for (let booking of activeBookings) {
      const anomaly = await detectAnomalies(booking._id, booking.escrowStatus);
      if (anomaly) results.push({ bookingId: booking._id, anomaly });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch anomalies" });
  }
});

/**
 * GET /api/admin/users
 * List all users with optional filters
 */
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

/**
 * PATCH /api/admin/users/:userId/verify
 * Verify or unverify a user
 */
router.patch("/users/:userId/verify", async (req, res) => {
  try {
    const { verified } = req.body;
    if (typeof verified !== "boolean") {
      return res.status(400).json({ success: false, message: "Verified must be boolean" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { verified },
      { new: true }
    );

    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update user verification" });
  }
});

/**
 * GET /api/admin/billing
 * Summary of subscriptions and payments
 */
router.get("/billing", async (req, res) => {
  try {
    // Example: total active subscriptions
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ verified: true });

    res.json({
      success: true,
      data: { totalUsers, verifiedUsers },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch billing summary" });
  }
});

export default router;
