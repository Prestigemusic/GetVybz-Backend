import express from "express";

const app = express();

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "GetVybz backend is running 🚀" });
});

// Example: later we’ll add /api/services, /api/bookings, etc.

app.listen(4000, () => {
  console.log("✅ Backend running at http://localhost:4000");
});
