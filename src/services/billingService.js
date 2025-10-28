// src/services/billingService.js
import Subscription from "../models/Subscription.js";
import Invoice from "../models/Invoice.js";
import Organization from "../models/Organization.js";
import paymentGateway from "./paymentGatewayAdapter.js"; // previously created stub adapter
import logger from "../utils/logger.js";
import mongoose from "mongoose";

/**
 * Default plan amounts (NGN)
 * Update as desired.
 */
const PLAN_AMOUNTS = {
  free: 0,
  pro: 5000,
  enterprise: 20000,
};

/** Utility: compute next billing date */
function addDays(date = new Date(), days = 30) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Create or update a subscription for an organization.
 * - Creates a Subscription doc
 * - Creates an initial Invoice (pending) and attempts to charge immediately
 */
export const createOrUpdateSubscription = async ({ organizationId, plan, gateway = "paystack", billingCycleDays = 30 }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const org = await Organization.findById(organizationId).session(session);
    if (!org) throw new Error("Organization not found");

    const amount = PLAN_AMOUNTS[plan] ?? 0;
    const startDate = new Date();
    const nextBillingDate = addDays(startDate, billingCycleDays);

    // Upsert subscription
    let subscription = await Subscription.findOne({ organizationId }).session(session);
    if (!subscription) {
      subscription = new Subscription({
        organizationId,
        plan,
        amount,
        currency: "NGN",
        startDate,
        nextBillingDate,
        billingCycleDays,
        gateway,
      });
    } else {
      // update existing
      subscription.plan = plan;
      subscription.amount = amount;
      subscription.billingCycleDays = billingCycleDays;
      subscription.gateway = gateway;
      subscription.startDate = startDate;
      subscription.nextBillingDate = nextBillingDate;
      subscription.status = "active";
    }
    await subscription.save({ session });

    // Create invoice for initial charge (status: pending)
    const invoice = new Invoice({
      organizationId,
      subscriptionId: subscription._id,
      amount,
      currency: "NGN",
      status: amount === 0 ? "paid" : "pending",
      dueDate: startDate,
    });
    if (amount === 0) {
      invoice.paidAt = new Date();
      invoice.gatewayReference = "FREE_PLAN";
    }
    await invoice.save({ session });

    // If amount > 0: attempt immediate charge using adapter (stub handles test flows)
    if (amount > 0) {
      try {
        // Adapter design: charge returns { success, reference, raw }
        const chargeResult = await paymentGateway.holdFunds({
          amount,
          bookingId: String(organizationId), // reusing holdFunds shape — adapter is a stub; adjust when using real API
          gateway,
        });

        // Mark invoice accordingly
        invoice.gatewayReference = chargeResult.reference || chargeResult?.data?.reference || "manual_ref";
        invoice.gatewayResponse = chargeResult;
        invoice.status = chargeResult ? "paid" : "failed";
        invoice.paidAt = chargeResult ? new Date() : invoice.paidAt;
        await invoice.save({ session });

        // update subscription next billing date if paid
        if (invoice.status === "paid") {
          subscription.nextBillingDate = addDays(new Date(), billingCycleDays);
          subscription.status = "active";
          await subscription.save({ session });
        } else {
          subscription.status = "past_due";
          await subscription.save({ session });
        }
      } catch (chargeErr) {
        logger.error("billingService initial charge failed", chargeErr);
        invoice.status = "failed";
        invoice.gatewayResponse = chargeErr?.message || chargeErr;
        await invoice.save({ session });

        subscription.status = "past_due";
        await subscription.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    logger.info("createOrUpdateSubscription completed", { organizationId, plan });
    return { subscription, invoice };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error("createOrUpdateSubscription failed", err);
    throw err;
  }
};

/**
 * Charge due subscriptions (to be run by scheduler)
 * - Finds subscriptions with nextBillingDate <= now and status active or past_due
 * - Creates invoice and attempts charge
 */
export const chargeDueSubscriptions = async ({ limit = 100 } = {}) => {
  const now = new Date();
  const due = await Subscription.find({
    nextBillingDate: { $lte: now },
    status: { $in: ["active", "past_due"] },
  }).limit(limit);

  const summary = { processed: 0, paid: 0, failed: 0, errors: [] };

  for (const sub of due) {
    try {
      summary.processed++;
      const amount = sub.amount;
      const orgId = sub.organizationId;

      // create invoice (pending)
      const invoice = new Invoice({
        organizationId: orgId,
        subscriptionId: sub._id,
        amount,
        currency: sub.currency,
        status: "pending",
        dueDate: new Date(),
      });
      await invoice.save();

      // attempt charge via adapter
      let chargeResult;
      try {
        chargeResult = await paymentGateway.holdFunds({
          amount,
          bookingId: String(orgId),
          gateway: sub.gateway,
        });
      } catch (err) {
        logger.warn("chargeDueSubscriptions adapter holdFunds failed", err);
      }

      if (chargeResult) {
        invoice.gatewayReference = chargeResult.reference || chargeResult?.data?.reference;
        invoice.gatewayResponse = chargeResult;
        invoice.status = "paid";
        invoice.paidAt = new Date();
        await invoice.save();

        // advance subscription
        sub.nextBillingDate = addDays(new Date(), sub.billingCycleDays);
        sub.status = "active";
        await sub.save();

        summary.paid++;
      } else {
        invoice.status = "failed";
        await invoice.save();

        sub.status = "past_due";
        await sub.save();

        summary.failed++;
      }
    } catch (err) {
      logger.error("chargeDueSubscriptions failed for sub", sub._id, err);
      summary.errors.push({ subscriptionId: sub._id, message: err.message });
    }
  }

  return summary;
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async ({ organizationId, immediate = false }) => {
  const sub = await Subscription.findOne({ organizationId });
  if (!sub) throw new Error("Subscription not found");
  sub.status = "cancelled";
  sub.canceledAt = new Date();
  if (immediate) {
    sub.nextBillingDate = null;
  }
  await sub.save();
  return sub;
};

/**
 * Get subscription and invoices for org
 */
export const getOrganizationBillingDetails = async ({ organizationId }) => {
  const subscription = await Subscription.findOne({ organizationId }).lean();
  const invoices = await Invoice.find({ organizationId }).sort({ createdAt: -1 }).limit(50).lean();
  return { subscription, invoices };
};
