// src/index.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

import bookingsRoute from "./routes/bookings.js";
import messagesRoute from "./routes/messages.js";
import jobsRoute from "./routes/jobs.js";
import profilesRoute from "./routes/profiles.js";
import authRoute from "./routes/auth.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

const app = express();
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
app.use("/api/auth", authRoute); // ✅ now mounted

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
