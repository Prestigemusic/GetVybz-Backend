// src/services/disputeService.js
import Booking from "../models/Booking.js";
import Dispute from "../models/Dispute.js";
import Transaction from "../models/Transaction.js";
import { notifyAdmin } from "./adminNotificationService.js";
import { calculateTrustScore } from "./trustScoreService.js";
import logger from "../utils/logger.js";

/**
 * 🧾 Create a new dispute
 */
export async function createDispute({ bookingId, raisedBy, reason, description }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const dispute = await Dispute.create({
    bookingId,
    raisedBy,
    reason,
    description,
    status: "open",
  });

  await notifyAdmin(
    "New Dispute Raised",
    `A new dispute has been raised for booking ${bookingId}`,
    { type: "DISPUTE", severity: "high", relatedIds: { bookingId, disputeId: dispute._id } }
  );

  logger.info("🚨 New dispute created", { disputeId: dispute._id });
  return dispute;
}

/**
 * ✅ Resolve a dispute
 */
export async function resolveDispute({ disputeId, resolvedBy, resolution, winnerId }) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error("Dispute not found");

  dispute.status = "resolved";
  dispute.resolution = resolution;
  dispute.winnerId = winnerId;
  dispute.resolvedBy = resolvedBy;
  dispute.resolvedAt = new Date();
  await dispute.save();

  // Update booking status if needed
  const booking = await Booking.findById(dispute.bookingId);
  if (booking) {
    booking.status = "dispute_resolved";
    await booking.save();
  }

  // Recalculate trust scores for both parties
  await calculateTrustScore(booking.proId);
  await calculateTrustScore(booking.customerId);

  await notifyAdmin(
    "Dispute Resolved",
    `Dispute ${disputeId} has been resolved by admin ${resolvedBy}`,
    { type: "DISPUTE_RESOLVED", severity: "medium", relatedIds: { disputeId, bookingId: booking._id } }
  );

  logger.info("✅ Dispute resolved", { disputeId });
  return dispute;
}

/**
 * 🔍 Get disputes (admin or user-specific)
 */
export async function getDisputes({ userId, role }) {
  const filter = role === "admin" ? {} : { raisedBy: userId };
  return Dispute.find(filter).sort({ createdAt: -1 });
}

/**
 * 🧩 Get dispute details
 */
export async function getDisputeById(disputeId) {
  const dispute = await Dispute.findById(disputeId)
    .populate("bookingId")
    .populate("raisedBy", "name email")
    .populate("winnerId", "name email");

  if (!dispute) throw new Error("Dispute not found");
  return dispute;
}

// ✅ Add a clean default export so controller imports work
export default {
  createDispute,
  resolveDispute,
  getDisputes,
  getDisputeById,
};
