// backend/src/index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import listEndpoints from "express-list-endpoints";
import OpenAI from "openai";
import cron from "node-cron";

// --- Custom Middleware & Utilities ---
import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import { scheduleMonetizationCleanup } from "./cron/monetization.js";
import { scheduleCloudinaryCleanup } from "./cron/cloudinaryCleanup.js";
import { chargeDueSubscriptions } from "./services/billingService.js";
import { initSocket } from "./config/socket.js";

// --- Route Imports ---
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import bookingsRoutes from "./routes/bookings.js";
import messageRoutes from "./routes/messages.js";
import profileRoutes from "./routes/profileRoutes.js";
import proStatusRoutes from "./routes/proStatus.js";
import webhookRoutes from "./routes/webhooks.js"; // ⚠️ handles raw body internally
import escrowRoutes from "./routes/escrowRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import trustScoreRoutes from "./routes/trustScoreRoutes.js";
import matchingRoutes from "./routes/matchingRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import adminDisputeRoutes from "./routes/adminDisputeRoutes.js";
import adminNotificationRoutes from "./routes/adminNotificationRoutes.js";
import { startBackgroundJobs } from "./jobs/backgroundJobs.js";


// --- Background Jobs ---
import "./jobs/autoSettleJob.js";
import "./jobs/trustScoreJob.js";
import "./jobs/escrowAutoSettleJob.js";
import "./jobs/reconcileTransactionsJob.js";


// --- Config ---
dotenv.config();

// ------------------- INITIALIZE APP -------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ------------------- MIDDLEWARE -------------------
app.use(cors());
startBackgroundJobs();


// initialize socket.io
initSocket(server);

// Attach socket.io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ------------------- HEALTH CHECK -------------------
app.get("/", (req, res) => res.send("✅ GetVybz API is running..."));
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() })
);
app.get("/health", (req, res) => res.status(200).send("OK"));

// ------------------- OPENAI EVENT PLANNER -------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/openai/plan", async (req, res, next) => {
  const { query, budget } = req.body || {};
  if (!query)
    return res.status(400).json({ error: "Missing 'query' in request body." });

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
        {
          role: "system",
          content:
            "You are Vybz AI, a concise assistant returning only category names.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.6,
    });

    const text = response.choices?.[0]?.message?.content || "";
    const cleaned = text
      .replace(/\n/g, ", ")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return res.json({ suggestions: cleaned });
  } catch (err) {
    next(err);
  }
});

// ------------------- ROUTES -------------------
app.use("/api/webhooks", webhookRoutes);
logger.info("✅ Webhooks mounted at /api/webhooks");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/pros", proStatusRoutes);
app.use("/api/escrow", escrowRoutes);
app.use("/api/orgs", organizationRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/trustscore", trustScoreRoutes);
app.use("/api/match", matchingRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/admin/disputes", adminDisputeRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);


// ------------------- ERROR HANDLER -------------------
app.use(errorHandler);

// ------------------- SOCKET.IO EVENTS -------------------
io.on("connection", (socket) => {
  logger.info(`⚡ User connected: ${socket.id}`);

  socket.on("register", (userId) => {
    socket.join(userId);
    logger.info(`✅ User ${userId} joined socket room`);
  });

  socket.on("disconnect", () => {
    logger.info(`❌ User disconnected: ${socket.id}`);
  });
});

// ------------------- MONGODB CONNECTION -------------------
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  logger.error("❌ MONGO_URI not defined in .env");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      logger.info("✅ Connected to MongoDB");
      logger.info("📌 Registered endpoints:", listEndpoints(app));
    })
    .catch((err) => logger.error("❌ MongoDB connection failed:", err));
}

// ------------------- CRON JOBS -------------------
scheduleMonetizationCleanup();
scheduleCloudinaryCleanup();

cron.schedule("0 2 * * *", async () => {
  logger.info("Running daily subscription billing job...");
  await chargeDueSubscriptions();
});

// ------------------- SERVER START -------------------
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info("📌 Health check endpoints ready.");
});

// ------------------- BILLING JOBS -------------------
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

mongoose.connection.once("connected", async () => {
  try {
    const startupSummary = await chargeDueSubscriptions({ limit: 200 });
    logger.info("💳 Billing sweep (startup):", startupSummary);
  } catch (err) {
    logger.error("Billing sweep startup error:", err);
  }

  setInterval(async () => {
    try {
      const summary = await chargeDueSubscriptions({ limit: 200 });
      logger.info("💳 Scheduled billing sweep:", summary);
    } catch (err) {
      logger.error("Scheduled billing sweep failed:", err);
    }
  }, ONE_DAY_MS);
});

// ------------------- GRACEFUL SHUTDOWN -------------------
const shutdown = async (signal) => {
  logger.warn(`⚠️ Received ${signal}. Gracefully shutting down...`);

  try {
    // Stop new connections
    server.close(() => logger.info("🛑 HTTP server closed."));

    // Disconnect all socket clients
    io.close(() => logger.info("🔌 Socket.IO closed."));

    // Close DB
    await mongoose.connection.close(false);
    logger.info("🗄️ MongoDB connection closed.");

    process.exit(0);
  } catch (err) {
    logger.error("🔥 Error during shutdown:", err);
    process.exit(1);
  }
};

// Catch OS signals
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((sig) =>
  process.on(sig, () => shutdown(sig))
);

// Catch unhandled errors
process.on("unhandledRejection", (reason) => {
  logger.error("💥 Unhandled Promise Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  logger.error("💥 Uncaught Exception:", err);
  shutdown("uncaughtException");
});

// ------------------- EXPORT APP -------------------
export default app;
