// src/models/Escrow.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const EscrowSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    amount: { type: Number, required: true },

    state: {
      type: String,
      enum: ["pending", "held", "released", "refunded", "disputed", "cancelled"],
      default: "pending",
      index: true,
    },

    paymentGateway: { type: String, default: null },
    gatewayReference: { type: String }, // only indexed once below
    idempotencyKey: { type: String, index: true },

    reconciled: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
    scheduledReleaseAt: { type: Date, default: null },
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Lookups
EscrowSchema.index({ bookingId: 1, state: 1 });
EscrowSchema.index({ gatewayReference: 1 }); // single definition only

// --- Instance methods ---
EscrowSchema.methods.markReleased = async function (note = "") {
  this.state = "released";
  if (note) {
    this.metadata = { ...(this.metadata || {}), releaseNote: note };
  }
  await this.save();
  return this;
};

EscrowSchema.methods.markRefunded = async function (note = "") {
  this.state = "refunded";
  if (note) {
    this.metadata = { ...(this.metadata || {}), refundNote: note };
  }
  await this.save();
  return this;
};

export default model("Escrow", EscrowSchema);
