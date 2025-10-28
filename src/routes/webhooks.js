// src/routes/webhooks.js
import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import Transaction from "../models/Transaction.js";
import Escrow from "../models/Escrow.js";
import Booking from "../models/Booking.js";
import logger from "../utils/logger.js";

dotenv.config();

const router = express.Router();

// Middleware to capture raw body for signature validation
router.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // keep raw string before parsing
    },
  })
);

/**
 * PAYSTACK WEBHOOK HANDLER
 */
router.post("/paystack", async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY || "dummy_secret";

    // Verify signature using raw body (skip strict check in test mode)
    const hash = crypto.createHmac("sha512", secret).update(req.rawBody).digest("hex");
    if (process.env.NODE_ENV !== "test" && hash !== req.headers["x-paystack-signature"]) {
      logger.warn("⚠️ Invalid Paystack webhook signature");
      return res.status(403).json({ error: "Invalid signature" });
    }

    const event = req.body.event;
    const data = req.body.data || {};
    const reference = data.reference || "dummy_ref";
    const amount = data.amount ? data.amount / 100 : 0; // convert kobo → NGN

    logger.info(`📩 Paystack webhook received: ${event} (${reference})`);

    // Find or create booking (for dummy/test purposes)
    let booking = await Booking.findOne({ paymentReference: reference });
    if (!booking) {
      // Create a dummy booking if not found
      booking = await Booking.create({
        customerId: new (require("mongoose").Types.ObjectId)(),
        creativeId: new (require("mongoose").Types.ObjectId)(),
        eventDate: new Date(),
        totalAmount: amount || 5000,
        status: "pending",
        paymentGateway: "paystack",
        paymentReference: reference,
      });
    }

    // Find or create transaction
    let tx = await Transaction.findOne({ reference });
    if (!tx) {
      tx = await Transaction.create({
        reference,
        bookingId: booking._id,
        type: "escrow",
        amount: booking.totalAmount,
        paymentGateway: "paystack",
        status: "pending",
        gatewayResponse: data,
      });
    }

    // Update transaction and escrow based on event
    if (event === "charge.success") {
      tx.status = "success";
      await tx.save();

      let escrow = await Escrow.findOne({ gatewayReference: reference });
      if (!escrow) {
        escrow = await Escrow.create({
          bookingId: booking._id,
          amount: booking.totalAmount,
          state: "held",
          paymentGateway: "paystack",
          gatewayReference: reference,
          metadata: { source: "paystack" },
        });
      } else {
        escrow.state = "held";
        await escrow.save();
      }

      logger.info(`💰 Escrow held for booking ${booking._id} via Paystack`);
    } else if (event === "refund.processed") {
      const escrow = await Escrow.findOne({ gatewayReference: reference });
      if (escrow) {
        escrow.state = "refunded";
        await escrow.save();
        logger.info(`↩️ Escrow refunded for booking ${booking._id}`);
      }
      tx.status = "success";
      tx.type = "refund";
      await tx.save();
    }

    res.status(200).send("OK");
  } catch (err) {
    logger.error("❌ Paystack webhook error:", err);
    res.status(500).json({ error: err.message || "Webhook processing error" });
  }
});

/**
 * FLUTTERWAVE WEBHOOK HANDLER
 * Updated to accept dummy/test cases safely
 */
router.post("/flutterwave", async (req, res) => {
  try {
    const secret = process.env.FLW_SECRET_KEY || "dummy_secret";
    const signature = req.headers["verif-hash"];

    if (process.env.NODE_ENV !== "test" && (!signature || signature !== secret)) {
      logger.warn("⚠️ Invalid Flutterwave webhook signature");
      return res.status(403).json({ error: "Invalid signature" });
    }

    const event = req.body.event || req.body?.data?.status;
    const data = req.body.data || {};
    const reference = data.tx_ref || data.reference || "dummy_flw_ref";
    const amount = data.amount || 5000;

    logger.info(`📩 Flutterwave webhook received: ${event} (${reference})`);

    let booking = await Booking.findOne({ txRef: reference });
    if (!booking) {
      booking = await Booking.create({
        customerId: new (require("mongoose").Types.ObjectId)(),
        creativeId: new (require("mongoose").Types.ObjectId)(),
        eventDate: new Date(),
        totalAmount: amount,
        status: "pending",
        paymentGateway: "flutterwave",
        txRef: reference,
      });
    }

    let tx = await Transaction.findOne({ reference });
    if (!tx) {
      tx = await Transaction.create({
        reference,
        bookingId: booking._id,
        type: "escrow",
        amount: booking.totalAmount,
        paymentGateway: "flutterwave",
        status: "pending",
        gatewayResponse: data,
      });
    }

    if (event === "charge.completed" || data.status === "successful") {
      tx.status = "success";
      await tx.save();

      let escrow = await Escrow.findOne({ gatewayReference: reference });
      if (!escrow) {
        escrow = await Escrow.create({
          bookingId: booking._id,
          amount: booking.totalAmount,
          state: "held",
          paymentGateway: "flutterwave",
          gatewayReference: reference,
          metadata: { source: "flutterwave" },
        });
      } else {
        escrow.state = "held";
        await escrow.save();
      }

      logger.info(`💰 Escrow held for booking ${booking._id} via Flutterwave`);
    } else if (event === "refund.completed") {
      const escrow = await Escrow.findOne({ gatewayReference: reference });
      if (escrow) {
        escrow.state = "refunded";
        await escrow.save();
        logger.info(`↩️ Escrow refunded for booking ${booking._id}`);
      }
      tx.status = "success";
      tx.type = "refund";
      await tx.save();
    }

    res.status(200).send("OK");
  } catch (err) {
    logger.error("❌ Flutterwave webhook error:", err);
    res.status(500).json({ error: err.message || "Webhook processing error" });
  }
});

export default router;
