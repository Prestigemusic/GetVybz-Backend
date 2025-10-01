// BACKEND: src/routes/profileRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import User from "../models/User.js"; // <-- ensure this file exists

const router = express.Router();

// GET /api/profiles/me
router.get("/me", protect, async (req, res) => {
  try {
    // req.user should be set by your protect middleware (usually with id)
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("-password"); // omit password
    if (!user) return res.status(404).json({ message: "User not found" });

    // If the user is a 'pro', also fetch pro-specific doc if you have a separate 'pros' collection
    // (Optional) If you store pro profile in 'pros' collection, join or fetch it here.

    res.json({ profile: user });
  } catch (err) {
    console.error("GET /api/profiles/me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
