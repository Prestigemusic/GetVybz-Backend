// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { handleReferral } from "../services/loyaltyHooks.js";

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// ------------------ SIGNUP ------------------
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, referrerId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Please fill in all fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Referral bonus hook
    if (referrerId) {
      try {
        await handleReferral(referrerId, user._id);
        console.log(`🏅 Referral bonus awarded to ${referrerId}`);
      } catch (err) {
        console.warn("Referral hook failed", err);
      }
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// ------------------ LOGIN ------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Please enter all fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user._id, user.role);

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Server error during login" });
  }
};
