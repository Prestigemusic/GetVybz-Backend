// src/scripts/migrateEscrowFields.js
/**
 * Usage: node src/scripts/migrateEscrowFields.js
 *
 * This script will:
 * - Find bookings where paymentStatus in ['escrowed','pending','released','refunded']
 * - If booking.escrowId is missing, create a corresponding Escrow doc and link it
 *
 * Run once, inspect logs, then remove or keep for auditing.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Booking from "../models/Booking.js";
import Escrow from "../models/Escrow.js";

const MONGO = process.env.MONGO_URI || process.env.MONGO || null;

if (!MONGO) {
  console.error("MONGO_URI not set. Set in .env and re-run.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO, {});

  try {
    const statuses = ["escrowed", "pending", "released", "refunded"];
    const bookings = await Booking.find({ paymentStatus: { $in: statuses } }).lean();

    console.log(`Found ${bookings.length} booking(s) with paymentStatus in ${statuses.join(", ")}`);

    let created = 0;
    for (const b of bookings) {
      if (b.escrowId) continue; // already linked

      const escrowDoc = new Escrow({
        bookingId: b._id,
        amount: b.escrowAmount || b.totalAmount || 0,
        state: b.paymentStatus === "escrowed" ? "held" : b.paymentStatus,
        paymentGateway: b.paymentGateway || null,
        gatewayReference: b.gatewayReference || null,
      });

      await escrowDoc.save();
      await Booking.findByIdAndUpdate(b._id, { escrowId: escrowDoc._id });
      created++;
      console.log(`Created Escrow for booking ${b._id} -> ${escrowDoc._id}`);
    }

    console.log(`Migration complete. Created ${created} escrow document(s).`);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
