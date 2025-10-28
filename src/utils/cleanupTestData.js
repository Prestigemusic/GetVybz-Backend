// src/utils/cleanupTestData.js
import Booking from "../models/Booking.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";

/**
 * Cleanup dummy booking(s) and associated transaction(s)
 * @param {mongoose.Types.ObjectId|Array<mongoose.Types.ObjectId>} bookingIds
 */
export const cleanupTestData = async (bookingIds) => {
  if (!bookingIds) return;
  if (!Array.isArray(bookingIds)) bookingIds = [bookingIds];

  try {
    for (const id of bookingIds) {
      await Transaction.deleteMany({ bookingId: id });
      await Booking.findByIdAndDelete(id);
      console.log(`🧹 Cleaned up test booking and transactions for bookingId: ${id}`);
    }
  } catch (err) {
    console.error("❌ Error cleaning up test data:", err);
  }
};
