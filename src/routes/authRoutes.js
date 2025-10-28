import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/**
 * @POST /api/auth/signup
 * Create a new user (customer or pro)
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body; // 👈 role included
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default role to customer unless specified as pro
    const isPro = role === "pro";

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: isPro ? "pro" : "customer",
      isPro,
    });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Signup successful 🚀",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isPro: newUser.isPro,
        avatarUri: newUser.avatarUri || "",
        bannerUri: newUser.bannerUri || "",
        bio: newUser.bio || "",
      },
      token,
    });
  } catch (err) {
    console.error("🔥 Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @POST /api/auth/login
 * Authenticate existing users (customer or pro)
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ✅ Return full user info with role and isPro flags
    res.json({
      message: "Login successful 🎉",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPro: user.isPro || false,
        avatarUri: user.avatarUri || "",
        bannerUri: user.bannerUri || "",
        bio: user.bio || "",
      },
      token,
    });
  } catch (err) {
    console.error("🔥 Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
