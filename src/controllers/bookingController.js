// backend/src/controllers/bookingController.js
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { sendEmail } from "../utils/email.js";

/**
 * Create a new booking
 */
export const createBooking = async (req, res, next) => {
  try {
    const { eventTitle, eventDate, proId, customerId, details } = req.body;

    if (!eventTitle || !eventDate || !proId || !customerId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const booking = await Booking.create({
      eventTitle,
      eventDate,
      proId,
      customerId,
      details,
      status: "pending",
    });

    logger.info(`📅 New booking created: ${booking._id}`);

    // notify pro via email
    const pro = await User.findById(proId);
    if (pro?.email) {
      await sendEmail(
        pro.email,
        "New Booking Request",
        `You have a new booking request for ${eventTitle}.`
      );
    }

    return res.status(201).json(booking);
  } catch (err) {
    logger.error("Error creating booking:", err);
    next(err);
  }
};

/**
 * Get bookings for a user (customer or pro)
 */
export const getBookings = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const bookings = await Booking.find({
      $or: [{ customerId: userId }, { proId: userId }],
    }).sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    logger.error("Error fetching bookings:", err);
    next(err);
  }
};

/**
 * Confirm booking
 */
export const confirmBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status: "confirmed" },
      { new: true }
    );

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    logger.info(`✅ Booking ${id} confirmed`);
    res.json(booking);
  } catch (err) {
    logger.error("Error confirming booking:", err);
    next(err);
  }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    );

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    logger.info(`❌ Booking ${id} cancelled`);
    res.json(booking);
  } catch (err) {
    logger.error("Error cancelling booking:", err);
    next(err);
  }
};
