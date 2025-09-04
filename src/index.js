import express from "express";
import bookingsRoute from "./routes/bookings.js";
import messagesRoute from "./routes/messages.js";
import jobsRoute from "./routes/jobs.js";
import profilesRoute from "./routes/profiles.js";

const app = express();
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "GetVybz backend is running 🚀" });
});

// Routes
app.use("/api/bookings", bookingsRoute);
app.use("/api/messages", messagesRoute);
app.use("/api/jobs", jobsRoute);
app.use("/api/profiles", profilesRoute);

// Auto-port detection
const DEFAULT_PORT = 4000;
function startServer(port) {
  app.listen(port)
    .on("listening", () => {
      console.log(`✅ Backend running at http://localhost:${port}`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`⚠️ Port ${port} busy, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error(err);
      }
    });
}

startServer(DEFAULT_PORT);
