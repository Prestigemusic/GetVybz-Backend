// src/routes/bookings.js
import express from "express";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/bookings/my  - protected
router.get("/my", protect, (req, res) => {
  // TODO: Replace with DB query using req.user.id
  res.json({
    bookings: [
      { id: 1, service: "Photography", date: "2025-09-21", customer: req.user?.id },
      { id: 2, service: "DJ Service", date: "2025-09-22", customer: req.user?.id },
    ],
  });
});

// POST /api/bookings
router.post("/", protect, (req, res) => {
  const { customerName, service } = req.body;
  res.json({
    message: "Booking created successfully",
    booking: { customerName, service, createdBy: req.user?.id },
  });
});

export default router;
