// src/services/gamificationService.js
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import logger from "../utils/logger.js";

// -------------------- Configuration --------------------
const POINTS_CONFIG = {
  bookingCompletion: 10,
  reviewSubmission: 5,
  referralSignup: 20,
  referralFirstBooking: 50,
};

const BADGES_CONFIG = [
  { name: "Rising Star", minPoints: 50 },
  { name: "Pro Performer", minPoints: 200 },
  { name: "Elite Vybz", minPoints: 500 },
];

// -------------------- Utility Functions --------------------
const calculateBadge = (points) => {
  let badge = null;
  for (const b of BADGES_CONFIG) {
    if (points >= b.minPoints) badge = b.name;
  }
  return badge;
};

// -------------------- Hook: Booking Completion --------------------
export const onBookingCompleted = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error("Booking not found");

    const customer = await User.findById(booking.customerId);
    const pro = await User.findById(booking.proId);

    if (!customer || !pro) throw new Error("Users not found");

    // Add points for booking completion
    customer.points = (customer.points || 0) + POINTS_CONFIG.bookingCompletion;
    pro.points = (pro.points || 0) + POINTS_CONFIG.bookingCompletion;

    // Update badges
    customer.badge = calculateBadge(customer.points);
    pro.badge = calculateBadge(pro.points);

    await customer.save();
    await pro.save();

    logger.info(`🏆 Booking completed gamification applied: ${bookingId}`);

  } catch (err) {
    logger.error("Booking completion gamification error", err);
  }
};

// -------------------- Hook: Review Submission --------------------
export const onReviewSubmitted = async ({ bookingId, reviewerId }) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error("Booking not found");

    const reviewer = await User.findById(reviewerId);
    const targetId =
      reviewerId.toString() === booking.customerId.toString()
        ? booking.proId
        : booking.customerId;

    const target = await User.findById(targetId);

    if (!reviewer || !target) throw new Error("Users not found");

    // Award points for submitting a review
    reviewer.points = (reviewer.points || 0) + POINTS_CONFIG.reviewSubmission;
    target.points = (target.points || 0) + POINTS_CONFIG.reviewSubmission;

    // Update badges
    reviewer.badge = calculateBadge(reviewer.points);
    target.badge = calculateBadge(target.points);

    await reviewer.save();
    await target.save();

    logger.info(`⭐ Review gamification applied: Booking ${bookingId}`);

  } catch (err) {
    logger.error("Review submission gamification error", err);
  }
};

// -------------------- Hook: Referral Bonus --------------------
export const onReferralTriggered = async ({ referrerId, referredId, type }) => {
  try {
    const referrer = await User.findById(referrerId);
    const referred = await User.findById(referredId);

    if (!referrer || !referred) throw new Error("Users not found");

    let points = 0;
    if (type === "signup") points = POINTS_CONFIG.referralSignup;
    if (type === "firstBooking") points = POINTS_CONFIG.referralFirstBooking;

    referrer.points = (referrer.points || 0) + points;
    referrer.badge = calculateBadge(referrer.points);

    await referrer.save();

    logger.info(`💰 Referral bonus applied to ${referrerId}: ${type}, +${points} points`);
  } catch (err) {
    logger.error("Referral gamification error", err);
  }
};
