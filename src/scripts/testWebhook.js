// src/scripts/testWebhook.js
import fetch from "node-fetch";
import crypto from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";

// --- Load env ---
dotenv.config();

// --- Mongoose models ---
import Booking from "../models/Booking.js";
import Transaction from "../models/Transaction.js";
import Escrow from "../models/Escrow.js";
import { cleanupTestData } from "../utils/cleanupTestData.js";


// --- Base webhook URL ---
const baseUrl = "http://localhost:8000/api/webhooks";

// --- Connect to MongoDB ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error("MONGO_URI not defined in .env");

await mongoose.connect(MONGO_URI);
console.log("✅ Connected to MongoDB");

// ------------------- PAYSTACK TEST -------------------
const testPaystack = async () => {
  // 1️⃣ Create a dummy booking
  const booking = await Booking.create({
    customerId: new mongoose.Types.ObjectId(),
    creativeId: new mongoose.Types.ObjectId(),
    eventDate: new Date(),
    totalAmount: 5000,
    paymentReference: "test_ref_" + Date.now(), // Paystack
    status: "pending",
  });

  // 2️⃣ Create a corresponding dummy transaction
  await Transaction.create({
    reference: booking.paymentReference,
    bookingId: booking._id,
    type: "escrow",
    amount: booking.totalAmount,
    paymentGateway: "paystack",
    status: "pending",
    gatewayResponse: {},
  });

  const payload = {
    event: "charge.success",
    data: {
      reference: booking.paymentReference,
      amount: booking.totalAmount * 100, // NGN → kobo
      status: "success",
      customer: { email: "test@vybz.com" },
    },
  };

  const rawBody = JSON.stringify(payload);

  // 3️⃣ Create signature
  const signature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  console.info("[INFO] Sending simulated Paystack webhook for bookingId:", booking._id);
  console.debug("[DEBUG] Signature:", signature);

  // 4️⃣ Send webhook
  try {
    const res = await fetch(baseUrl + "/paystack", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": signature,
      },
      body: rawBody,
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text);
    console.info("[SUCCESS] ✅ Paystack webhook accepted:", text);
  } catch (err) {
    console.error("[ERROR] ❌ Paystack webhook test failed:", err.message || err);
  } finally {
    // 5️⃣ Cleanup
    await Booking.findByIdAndDelete(booking._id);
    await Transaction.deleteMany({ bookingId: booking._id });
    console.log("🧹 Test booking and transaction cleaned up");
    await cleanupTestData(booking._id);
    mongoose.connection.close();
  }
};

// ------------------- FLUTTERWAVE TEST -------------------
const testFlutterwave = async () => {
  const booking = await Booking.create({
    customerId: new mongoose.Types.ObjectId(),
    creativeId: new mongoose.Types.ObjectId(),
    eventDate: new Date(),
    totalAmount: 5000,
    txRef: "flw_ref_" + Date.now(), // Flutterwave
    status: "pending",
  });

  await Transaction.create({
    reference: booking.txRef,
    bookingId: booking._id,
    type: "escrow",
    amount: booking.totalAmount,
    paymentGateway: "flutterwave",
    status: "pending",
    gatewayResponse: {},
  });

  const payload = {
    event: "charge.completed",
    data: {
      tx_ref: booking.txRef,
      amount: booking.totalAmount,
      status: "successful",
    },
  };

  const rawBody = JSON.stringify(payload);

  console.info("[INFO] Sending simulated Flutterwave webhook for bookingId:", booking._id);

  try {
    const res = await fetch(baseUrl + "/flutterwave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "verif-hash": process.env.FLW_SECRET_KEY,
      },
      body: rawBody,
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text);
    console.info("[SUCCESS] ✅ Flutterwave webhook accepted:", text);
  } catch (err) {
    console.error("[ERROR] ❌ Flutterwave webhook test failed:", err.message || err);
  } finally {
    await Booking.findByIdAndDelete(booking._id);
    await Transaction.deleteMany({ bookingId: booking._id });
    console.log("🧹 Test booking and transaction cleaned up");
    mongoose.connection.close();
  }
};

// ------------------- EXECUTION -------------------
const arg = process.argv[2];
if (arg === "paystack") testPaystack();
else if (arg === "flutterwave") testFlutterwave();
else console.log("Usage: node src/scripts/testWebhook.js [paystack|flutterwave]");
