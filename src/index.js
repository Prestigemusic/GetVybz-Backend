// src/index.js  (update: add openai route near top, keep the rest)
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import listEndpoints from "express-list-endpoints";
import axios from "axios";

import authRoutes from "./routes/auth.js";
import bookingsRoutes from "./routes/bookings.js";
import messageRoutes from "./routes/messages.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Attach socket.io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- OpenAI proxy endpoint (POST /api/openai/plan) ---
// Requires process.env.OPENAI_API_KEY to be set in your backend .env
app.post("/api/openai/plan", async (req, res) => {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: "OpenAI key not configured on server." });
  }

  const { query, budget } = req.body || {};
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing 'query' in request body." });
  }

  // Prompt - concise output: categories list only
  const prompt = `
You are Vybz AI, an event planning assistant.
The user describes their event: "${query}".
Budget: ${budget ? `${budget}` : "not specified"}.

Return a concise list of recommended professional categories (3-6 items),
comma-separated, no explanation. Example: "DJs, Event Planners, Photographers"
  `;

  try {
    const payload = {
      model: "gpt-4o-mini", // fallback model - change as needed
      messages: [
        { role: "system", content: "You are Vybz AI, a concise assistant returning categories only." },
        { role: "user", content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.6,
    };

    const response = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    const text = response?.data?.choices?.[0]?.message?.content || response?.data?.choices?.[0]?.text || "";
    const cleaned = String(text).replace(/\n/g, ", ").split(",").map(s => s.trim()).filter(Boolean);
    return res.json({ suggestions: cleaned });
  } catch (err) {
    console.error("OpenAI plan error:", err?.response?.data || err?.message || err);
    return res.status(500).json({ error: "OpenAI request failed", details: err?.message || err });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/profiles", profileRoutes);

// Root & health
app.get("/", (req, res) => res.send("✅ GetVybz API is running..."));
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() }));

// Socket.io
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);
  socket.on("register", (userId) => {
    socket.join(userId);
    console.log(`✅ User ${userId} registered to socket room`);
  });
  socket.on("disconnect", () => console.log("❌ User disconnected:", socket.id));
});

// MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not defined in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    console.log("📌 Registered endpoints:", listEndpoints(app));
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Unable to connect to DB:", err);
    process.exit(1);
  });
