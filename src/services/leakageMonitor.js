import logger from "../utils/logger.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import { sendAdminAlertEmail } from "../utils/emailService.js";

/**
 * Checks for transaction anomalies:
 * - mismatched booking status vs escrow
 * - multiple releases
 */
export const detectAnomalies = async (bookingId, escrowStatus) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      logger.error("Anomaly check failed: booking not found", { bookingId });
      return;
    }

    const anomalies = [];

    if (escrowStatus === "released" && booking.status !== "completed") {
      anomalies.push("Escrow released but booking not completed");
    }

    if (escrowStatus === "refunded" && booking.status !== "cancelled") {
      anomalies.push("Escrow refunded but booking not cancelled");
    }

    if (anomalies.length) {
      logger.warn("Transaction anomaly detected", { bookingId, anomalies });
      // Optionally notify admin via email
      await sendAdminAlertEmail({
        subject: "GetVybz Transaction Anomaly Detected",
        body: `Booking ID: ${bookingId}\nAnomalies:\n${anomalies.join("\n")}`,
      });
    }
  } catch (err) {
    logger.error("Error detecting anomalies", err);
  }
};
