// src/index.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import profilesRoutes from "./routes/profiles.js";

dotenv.config();

const app = express();
app.use((req, res, next) => {
  console.log("<< SERVER INCOMING >>", req.method, req.originalUrl);
  next();
});


// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "GetVybz backend is running 🚀" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profilesRoutes);

// MongoDB connection + Server start
const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
