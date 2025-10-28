import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🧭 Create or update user by email
router.post("/", protect, async (req, res) => {
  try {
    const { email, ...rest } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    let user = await User.findOne({ email });
    if (user) {
      await User.updateOne({ email }, { $set: rest });
      user = await User.findOne({ email });
    } else {
      user = await User.create({ email, ...rest });
    }
    res.json(user);
  } catch (err) {
    console.error("❌ /api/users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🧭 Get user by email
router.get("/by-email", protect, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await User.findOne({ email }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🧭 Get user by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🧭 Update user by ID (POST or PUT)
router.post("/:id", protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
