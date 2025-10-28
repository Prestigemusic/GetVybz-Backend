// test/escrowTest.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Booking from "../src/models/Booking.js";
import Escrow from "../src/models/Escrow.js";
import Transaction from "../src/models/Transaction.js";
import escrowService from "../src/services/escrowService.js";

const { initializeEscrow, releaseFunds, refundFunds } = escrowService;

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getvybz_test";

const runTest = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 1️⃣ Create a dummy booking
    const booking = await Booking.create({
      customerId: new mongoose.Types.ObjectId(),
      creativeId: new mongoose.Types.ObjectId(),
      title: "Test Gig",
      description: "Testing escrow workflow",
      price: 5000,
      status: "pending",
    });
    console.log(`📌 Booking created: ${booking._id}`);

    // 2️⃣ Initialize escrow
    const escrowInit = await initializeEscrow({
      bookingId: booking._id,
      amount: booking.price,
      email: "customer@test.com",
      gateway: "paystack", // can also test 'flutterwave'
    });
    console.log(`💰 Escrow initialized:`, escrowInit);

    // 3️⃣ Simulate webhook: directly update escrow state to 'held' for testing
    const escrow = await Escrow.findById(escrowInit.escrowId);
    escrow.state = "held";
    escrow.gatewayReference = escrowInit.reference;
    await escrow.save();
    console.log(`📬 Escrow marked as held for testing`);

    // 4️⃣ Release escrow
    const released = await releaseFunds({ bookingId: booking._id });
    console.log(`🏁 Escrow released:`, released);

    // 5️⃣ Refund escrow (simulate new escrow for refund test)
    const escrowRefundInit = await initializeEscrow({
      bookingId: booking._id,
      amount: booking.price,
      email: "customer@test.com",
      gateway: "paystack",
    });
    const escrowRefund = await Escrow.findById(escrowRefundInit.escrowId);
    escrowRefund.state = "held";
    escrowRefund.gatewayReference = escrowRefundInit.reference;
    await escrowRefund.save();

    const refunded = await refundFunds({
      bookingId: booking._id,
      reason: "Customer cancelled gig",
    });
    console.log(`💸 Escrow refunded:`, refunded);

    console.log("🎉 Escrow test workflow completed successfully");
  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log("🛑 Test DB cleaned and disconnected");
  }
};

runTest();
