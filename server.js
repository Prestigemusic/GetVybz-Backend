import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";

import authRoutes from "./src/routes/authRoutes.js";
import profileRoutes from "./src/routes/profileRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGO_URI;

// Middleware
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.json());

// Serve uploads folder so images are accessible
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);

// Root check
app.get("/", (req, res) => {
  res.send("✅ GetVybz API is running...");
});

// Health check (for Render + frontend health probe)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Connect Mongo
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });
