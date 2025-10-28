// src/routes/bookings.js
import express from "express";
import Booking from "../models/Booking.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 Get bookings for current user
router.get("/", protect, async (req, res) => {
  try {
    const roleField = req.user.role === "pro" ? "pro" : "customer";
    const bookings = await Booking.find({ [roleField]: req.user._id })
      .populate("customer", "name email avatarUri")
      .populate("pro", "name email services");
    res.json(bookings);
  } catch (err) {
    console.error("❌ Fetch bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// 🔹 Get single booking by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customer", "name email avatarUri")
      .populate("pro", "name email services");

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (
      booking.customer._id.toString() !== req.user._id.toString() &&
      booking.pro._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "Not authorized to view this booking" });
    }

    res.json(booking);
  } catch (err) {
    console.error("❌ Booking fetch error:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// 🔹 Create a new booking
router.post("/", protect, async (req, res) => {
  try {
    const { proId, date, time, title } = req.body;
    if (!proId || !date || !time) return res.status(400).json({ error: "Missing required fields" });

    const exists = await Booking.findOne({
      pro: proId,
      date,
      time,
      status: { $ne: "Cancelled" },
    });
    if (exists) return res.status(409).json({ error: "This slot is already booked" });

    const booking = await Booking.create({
      customer: req.user._id,
      pro: proId,
      date,
      time,
      title: title || "Untitled Event",
      status: "Pending",
    });

    res.json(booking);
  } catch (err) {
    console.error("❌ Booking creation error:", err);
    res.status(500).json({ error: "Booking creation failed" });
  }
});

// 🔹 Confirm booking (Pro only)
router.patch("/:id/confirm", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.pro.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the Pro can confirm this booking" });
    }

    booking.status = "Confirmed";
    await booking.save();

    res.json({ message: "Booking confirmed", booking });
  } catch (err) {
    console.error("❌ Booking confirm error:", err);
    res.status(500).json({ error: "Failed to confirm booking" });
  }
});

// 🔹 Cancel booking (Pro or Customer)
router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (
      booking.customer.toString() !== req.user._id.toString() &&
      booking.pro.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "Not authorized to cancel this booking" });
    }

    booking.status = "Cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled", booking });
  } catch (err) {
    console.error("❌ Booking cancel error:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;
