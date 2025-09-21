// src/routes/profile.js
import express from "express";
import multer from "multer";
import path from "path";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// --- Multer setup (store locally in /uploads) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${file.fieldname}${ext}`);
  },
});
const upload = multer({ storage });

// --- Get current user profile ---
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Update name + bio ---
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { name, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, bio },
      { new: true }
    ).select("-password");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Upload profile picture ---
router.put(
  "/photo",
  authMiddleware,
  upload.single("photo"),
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { profilePicture: `/uploads/${req.file.filename}` },
        { new: true }
      ).select("-password");
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// --- Upload banner ---
router.put(
  "/banner",
  authMiddleware,
  upload.single("banner"),
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { coverPhoto: `/uploads/${req.file.filename}` },
        { new: true }
      ).select("-password");
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
