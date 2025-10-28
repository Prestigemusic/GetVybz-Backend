// routes/profile.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

// GET /api/profiles/me
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// PUT /api/profiles/me
router.put("/me", protect, async (req, res) => {
  try {
    const { name, location, bio, profilePicture, role, isPro } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 🔹 Update basic fields
    if (name) user.name = name;
    if (location) user.location = location;
    if (bio) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;

    // 🔹 Update role safely
    if (role) {
      // if they were already pro, they remain pro
      if (user.isPro || role === "pro") {
        user.role = role;
        user.isPro = true;
      } else {
        // pure customers cannot "upgrade" here
        if (role === "pro") {
          return res.status(403).json({
            error: "Not allowed. Customers cannot switch to Pro.",
          });
        }
        user.role = role;
      }
    }

    // 🔹 Respect explicit isPro flag if provided
    if (typeof isPro === "boolean") {
      if (user.isPro || isPro) user.isPro = true;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPro: user.isPro,
        profilePicture: user.profilePicture,
        bio: user.bio,
        location: user.location,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
