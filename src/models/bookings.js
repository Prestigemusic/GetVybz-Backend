import express from "express";
import Booking from "../models/Bookings.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import mongoose from "mongoose";

const router = express.Router();

// Create a booking
router.post("/", protect, async (req, res) => {
  try {
    const { proId, date, time, service } = req.body;

    const pro = await User.findById(proId);
    if (!pro) return res.status(404).json({ error: "Pro not found" });

    // Check availability
    const day = pro.availability.find(
      (a) => a.date.toISOString().split("T")[0] === date
    );
    if (!day) return res.status(400).json({ error: "No availability on this date" });

    const slot = day.slots.find((s) => s.time === time && !s.isBooked);
    if (!slot) return res.status(400).json({ error: "Slot not available" });

    // Mark slot as booked
    slot.isBooked = true;
    await pro.save();

    const booking = await Booking.create({
      pro: proId,
      customer: req.user._id,
      date,
      time,
      service,
      status: "Pending",
    });

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get my bookings
router.get("/my", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate("pro", "name email");
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;