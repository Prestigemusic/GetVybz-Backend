// backend/src/index.js
import "module-alias/register";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import listEndpoints from "express-list-endpoints";
import OpenAI from "openai";
import cron from "node-cron";

// --- Module-alias Imports ---
import authRoutes from "@routes/auth.js";
import bookingsRoutes from "@routes/bookings.js";
import messageRoutes from "@routes/messages.js";
import profileRoutes from "@routes/profileRoutes.js";
import proStatusRoutes from "@routes/proStatus.js";
import User from "@models/User.js";

dotenv.config();

// --- Init App ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Attach socket.io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- Health endpoints ---
app.get("/", (req, res) => res.send("✅ GetVybz API is running..."));
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() })
);
app.get("/health", (req, res) => res.status(200).send("OK"));

// --- OpenAI Setup ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- OpenAI Event Planning Endpoint ---
app.post("/api/openai/plan", async (req, res) => {
  const { query, budget } = req.body || {};
  if (!query) return res.status(400).json({ error: "Missing 'query' in request body." });

  const prompt = `
You are Vybz AI, an event planning assistant.
The user describes their event: "${query}".
Budget: ${budget || "not specified"}.

Return a concise list of recommended professional categories (3–6 items),
comma-separated, no explanation. Example: "DJs, Event Planners, Photographers".
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Vybz AI, a concise assistant returning categories only." },
        { role: "user", content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.6,
    });

    const text = response.choices[0]?.message?.content || "";
    const cleaned = text.replace(/\n/g, ", ").split(",").map((s) => s.trim()).filter(Boolean);
    return res.json({ suggestions: cleaned });
  } catch (err) {
    console.error("OpenAI SDK error:", err.response?.data || err.message);
    return res.status(500).json({ error: "OpenAI request failed", details: err.message });
  }
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/pros", proStatusRoutes);

// --- Socket.io Handlers ---
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  socket.on("register", (userId) => {
    socket.join(userId);
    console.log(`✅ User ${userId} registered to socket room`);
  });

  socket.on("disconnect", () => console.log("❌ User disconnected:", socket.id));
});

// --- Cron Job: Reset expired boosts & subscriptions ---
cron.schedule("0 0 * * *", async () => {
  console.log("🕛 Running daily monetization cleanup...");
  try {
    const now = new Date();

    // Expired boosts
    const boostResult = await User.updateMany(
      { boostExpiry: { $lt: now }, isBoosted: true },
      { $set: { isBoosted: false, boostExpiry: null } }
    );

    // Expired subscriptions
    const subResult = await User.updateMany(
      { subscriptionExpiry: { $lt: now }, subscriptionActive: true },
      { $set: { subscriptionActive: false, subscriptionExpiry: null } }
    );

    console.log(`✅ Boosts reset: ${boostResult.modifiedCount}`);
    console.log(`✅ Subscriptions reset: ${subResult.modifiedCount}`);
  } catch (err) {
    console.error("❌ Error running monetization cleanup:", err);
  }
});

// --- MongoDB Connect ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not defined in .env");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("✅ Connected to MongoDB");
      console.log("📌 Registered endpoints:", listEndpoints(app));
    })
    .catch((err) => console.error("❌ Unable to connect to DB:", err));
}

// --- Start Server ---
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("📌 Health check endpoints ready.");
});
