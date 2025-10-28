// server.js
import 'module-alias/register';
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import listEndpoints from "express-list-endpoints";
import OpenAI from "openai";
import cron from "node-cron";
import jwt from "jsonwebtoken";

// --- Route Imports (using module-alias for clarity) ---
import authRoutes from "@routes/auth.js";
import userRoutes from "@routes/users.js";
import bookingsRoutes from "@routes/bookings.js";
import messageRoutes from "@routes/messages.js";
import profileRoutes from "@routes/profileRoutes.js";
import paymentRoutes from "@routes/paymentRoutes.js";
import jobRoutes from "@routes/jobsRoutes.js";
import proStatusRoutes from "@routes/proStatus.js";
import uploadRoutes from "@routes/upload.js";

// --- Models & Utils ---
import User from "@models/User.js";
import Message from "@models/Message.js";
import { containsContact } from "@utils/contactBlocker.js";

// --- Config ---
dotenv.config();

// --- Init App ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Attach Socket.io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- Health Checks ---
app.get("/", (req, res) => res.send("✅ GetVybz API is running..."));
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() })
);
app.get("/health", (req, res) => res.status(200).send("OK"));

// --- OpenAI Setup ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- OpenAI Event Planner ---
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
        { role: "system", content: "You are Vybz AI, returning categories only." },
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

// --- Auth Middleware ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "vybz_secret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/pros", proStatusRoutes);
app.use("/api/upload", uploadRoutes);

// --- /api/auth/me ---
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error("/auth/me error:", err);
    return res.status(500).json({ error: "Server error fetching user" });
  }
});

// --- Socket.io Handlers ---
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  socket.on("register", (userId) => {
    socket.join(userId);
    console.log(`✅ User ${userId} registered to socket room`);
  });

  socket.on("sendMessage", async ({ sender, receiver, content }) => {
    if (!sender || !receiver || !content) return;
    try {
      if (containsContact(content)) {
        socket.emit("messageBlocked", {
          error: "Sharing phone numbers or bank details is disabled.",
        });
        return;
      }
      const newMsg = await Message.create({ sender, receiver, content, status: "sent" });
      io.to(receiver).emit("new_message", newMsg);
      io.to(sender).emit("new_message", newMsg);
    } catch (err) {
      console.error("Socket sendMessage error:", err);
    }
  });

  socket.on("disconnect", () => console.log("❌ User disconnected:", socket.id));
});

// --- Cron Job: Reset expired boosts/subscriptions ---
cron.schedule("0 0 * * *", async () => {
  console.log("🕛 Running daily monetization cleanup...");
  const now = new Date();
  try {
    await User.updateMany(
      { boostExpiry: { $lt: now }, isBoosted: true },
      { isBoosted: false, boostExpiry: null }
    );
    await User.updateMany(
      { subscriptionExpiry: { $lt: now }, subscriptionActive: true },
      { subscriptionActive: false, subscriptionExpiry: null }
    );
  } catch (err) {
    console.error("Error running monetization cleanup:", err);
  }
});

// --- MongoDB Connect ---
if (!process.env.MONGO_URI) console.error("❌ MONGO_URI not defined in .env");
else {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("✅ Connected to MongoDB");
      console.log("📌 Endpoints:", listEndpoints(app));
    })
    .catch((err) => console.error("❌ Unable to connect to DB:", err));
}

// --- Start Server ---
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
