import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET my bookings (for logged-in user)
router.get("/my", authMiddleware, (req, res) => {
  // Replace with actual DB query
  const userId = req.user.id;
  const myBookings = [
    { id: 1, customerId: userId, service: "Photography" },
    { id: 2, customerId: userId, service: "DJ Service" },
  ];
  res.json({ bookings: myBookings });
});

// POST create a booking
router.post("/", authMiddleware, (req, res) => {
  const { service } = req.body;
  const booking = {
    id: Date.now(),
    customerId: req.user.id,
    service,
  };
  res.status(201).json({ message: "Booking created", booking });
});

export default router;
