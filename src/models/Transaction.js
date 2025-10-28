// src/models/Transaction.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TransactionSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    creativeId: { type: Schema.Types.ObjectId, ref: "User" },

    amount: { type: Number, required: true },

    // 'escrow' | 'release' | 'refund' | 'payout' | 'fee'
    type: {
      type: String,
      enum: ["escrow", "release", "refund", "payout", "fee"],
      required: true,
    },

    // pending | success | failed
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    paymentGateway: { type: String }, // 'paystack' | 'flutterwave' | 'manual'

    reference: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },

    idempotencyKey: {
      type: String,
      index: true, // used for deduplication
    },

    gatewayResponse: { type: Schema.Types.Mixed }, // raw gateway payload for auditing
    note: { type: String },
  },
  { timestamps: true }
);

// Efficient lookups
TransactionSchema.index({ bookingId: 1, type: 1 });

export default model("Transaction", TransactionSchema);
