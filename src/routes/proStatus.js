import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Get Pro Status ---
router.get("/status/:userId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      isVerified: user.isVerified,
      isBoosted: user.isBoosted && user.boostExpiry > new Date(),
      boostExpiry: user.boostExpiry,
      subscriptionActive: user.subscriptionActive && user.subscriptionExpiry > new Date(),
      subscriptionExpiry: user.subscriptionExpiry,
    });
  } catch (err) {
    console.error("Error fetching pro status:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// --- Admin/Manual Boost ---
router.post("/boost", protect, async (req, res) => {
  const { userId, days = 7 } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isBoosted = true;
    user.boostExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await user.save();

    return res.json({ success: true, boostExpiry: user.boostExpiry });
  } catch (err) {
    console.error("Error boosting user:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// --- Admin/Manual Verification ---
router.post("/verify", protect, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isVerified = true;
    await user.save();

    return res.json({ success: true, isVerified: user.isVerified });
  } catch (err) {
    console.error("Error verifying user:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// --- Admin/Manual Subscription ---
router.post("/subscription", protect, async (req, res) => {
  const { userId, days = 30 } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.subscriptionActive = true;
    user.subscriptionExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await user.save();

    return res.json({ success: true, subscriptionExpiry: user.subscriptionExpiry });
  } catch (err) {
    console.error("Error updating subscription:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
