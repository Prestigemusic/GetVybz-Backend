import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------------
   🔹 AUTH SECTION
-------------------------------------------------- */

// POST /api/auth/signup
router.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashed,
      role: role || "customer",
      isPro: role === "pro",
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({ token, user: sanitizeUser(newUser) });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me
router.get("/auth/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Get /me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Optional logout endpoint
router.post("/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

/* -------------------------------------------------
   👤 USER SECTION
-------------------------------------------------- */

// GET /api/users/by-email?email=...
router.get("/users/by-email", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({});
    res.json({ id: user._id, data: sanitizeUser(user) });
  } catch (err) {
    console.error("by-email error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users (create or update)
router.post("/users", async (req, res) => {
  try {
    const { email, ...rest } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOneAndUpdate(
      { email },
      { $set: rest },
      { upsert: true, new: true }
    );
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error("User upsert error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------
   🧑‍🎤 PRO-SPECIFIC ROUTES
-------------------------------------------------- */

// Verify a Pro
router.put("/users/:proId/verify", async (req, res) => {
  try {
    const pro = await User.findByIdAndUpdate(
      req.params.proId,
      { isVerified: true },
      { new: true }
    );
    if (!pro) return res.status(404).json({ error: "Pro not found" });
    res.json(pro);
  } catch (error) {
    res.status(500).json({ error: "Failed to verify pro" });
  }
});

// Boost a Pro
router.put("/users/:proId/boost", async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    const pro = await User.findByIdAndUpdate(
      req.params.proId,
      { isBoosted: true, boostExpiry: expiry },
      { new: true }
    );
    if (!pro) return res.status(404).json({ error: "Pro not found" });
    res.json(pro);
  } catch (error) {
    res.status(500).json({ error: "Failed to boost pro" });
  }
});

// Get all Pros
router.get("/users/pros", async (req, res) => {
  try {
    const now = new Date();
    await User.updateMany(
      { isBoosted: true, boostExpiry: { $lt: now } },
      { isBoosted: false, boostExpiry: null }
    );
    const pros = await User.find({ role: "pro" }).sort({
      isBoosted: -1,
      isVerified: -1,
      "reviews.rating": -1,
    });
    res.json(pros);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pros" });
  }
});

/* -------------------------------------------------
   🧹 Utility
-------------------------------------------------- */
function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isPro: user.isPro || false,
    avatarUri: user.avatarUri || null,
    bannerUri: user.bannerUri || null,
    bio: user.bio || "",
    location: user.location || "",
    followers: user.followers || [],
    following: user.following || [],
    rating: user.rating || 0,
  };
}

export default router;
