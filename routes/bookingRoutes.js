import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();

// GET all bookings (for testing)
router.get("/", (req, res) => {
  res.json({ message: "All bookings" });
});

// ✅ GET bookings for the authenticated user
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // Replace with actual DB query
    const myBookings = [
      { id: 1, service: "Photography", customer: userId },
      { id: 2, service: "DJ", customer: userId },
    ];
    res.json({ bookings: myBookings });
  } catch (err) {
    console.error("❌ Error fetching user bookings:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create booking
router.post("/", authMiddleware, (req, res) => {
  const { customerName, service } = req.body;
  res.json({
    message: "Booking created successfully",
    booking: { customerName, service },
  });
});

export default router;
