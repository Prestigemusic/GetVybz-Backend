import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();

// GET my bookings
router.get("/my", authMiddleware, (req, res) => {
  // TODO: Replace with real DB query using req.user.id
  res.json({
    bookings: [
      { id: 1, service: "Photography", date: "2025-09-21", customer: req.user.id },
      { id: 2, service: "DJ Service", date: "2025-09-22", customer: req.user.id },
    ],
  });
});

// POST create a booking
router.post("/", authMiddleware, (req, res) => {
  const { customerName, service } = req.body;
  res.json({
    message: "Booking created successfully",
    booking: { customerName, service },
  });
});

export default router;
