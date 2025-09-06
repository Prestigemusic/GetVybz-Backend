// src/index.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import bookingsRoute from "./routes/bookings.js";
import messagesRoute from "./routes/messages.js";
import jobsRoute from "./routes/jobs.js";
import profilesRoute from "./routes/profiles.js";
import authRoute from "./routes/auth.js";

dotenv.config();

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "GetVybz backend is running 🚀" });
});

// Routes
app.use("/api/bookings", bookingsRoute);
app.use("/api/messages", messagesRoute);
app.use("/api/jobs", jobsRoute);
app.use("/api/profiles", profilesRoute);
app.use("/api/auth", authRoute);

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
