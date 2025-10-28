import Escrow from "../models/Escrow.js";
import Booking from "../models/Booking.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { recalcTrustScoreJob } from "../jobs/trustScoreJob.js";

/**
 * Release escrow funds to Pro after both reviews or after grace period
 */
export const settleEscrow = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const escrow = await Escrow.findOne({ bookingId });
  if (!escrow) throw new Error("Escrow record not found");

  if (escrow.status === "released") return escrow;

  const now = new Date();
  const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
  const completedAt = booking.completedAt || booking.updatedAt || now;
  const graceExpired = now - new Date(completedAt) > gracePeriodMs;

  const customerReviewed = booking.customerReviewed || false;
  const proReviewed = booking.proReviewed || false;

  if (!graceExpired && (!customerReviewed || !proReviewed)) {
    logger.info(`⏳ Waiting for both reviews before payout: booking ${bookingId}`);
    return null;
  }

  // ✅ Release payment
  escrow.status = "released";
  escrow.releasedAt = now;
  await escrow.save();

  const pro = await User.findById(booking.proId);
  if (!pro) throw new Error("Pro user not found");

  await Transaction.create({
    bookingId,
    userId: booking.proId,
    type: "payout",
    amount: escrow.amountHeld,
    status: "success",
    reference: `PAYOUT-${booking._id}`,
  });

  booking.paymentReleased = true;
  booking.settledAt = now;
  await booking.save();

  try {
    await recalcTrustScoreJob(booking.customerId);
    await recalcTrustScoreJob(booking.proId);
  } catch (err) {
    logger.error("TFBS recalculation failed post-settlement", err);
  }

  logger.info(`✅ Escrow released for booking ${bookingId}`);
  return escrow;
};

/**
 * Auto-settle pending escrows
 */
export const autoSettlePendingEscrows = async () => {
  const pending = await Escrow.find({ status: "held" });
  let releasedCount = 0;

  for (const escrow of pending) {
    try {
      await settleEscrow(escrow.bookingId);
      releasedCount++;
    } catch (err) {
      logger.error(`Auto-settle failed for booking ${escrow.bookingId}`, err);
    }
  }

  logger.info(`🧾 Auto-settlement job completed. Released ${releasedCount} escrows.`);
  return releasedCount;
};
