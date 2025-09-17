// src/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// @POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({
      message: "Signup successful 🚀",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        profilePicture: newUser.profilePicture,
        coverPhoto: newUser.coverPhoto,
        bio: newUser.bio,
        followers: newUser.followers,
        following: newUser.following,
        rating: newUser.rating,
      },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// @POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "Login successful 🎉",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        rating: user.rating,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
