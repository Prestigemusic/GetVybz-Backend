import mongoose from "mongoose";

const { Schema, model } = mongoose;

const BookingSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    proId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    eventDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
      default: "pending",
    },

    totalAmount: { type: Number, required: true },
    escrowAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "escrowed", "released", "refunded", "failed"],
      default: "unpaid",
    },

    paymentGateway: { type: String, default: null },
    escrowId: { type: Schema.Types.ObjectId, ref: "Escrow", default: null },
    contractURL: { type: String, default: null },
    paymentReference: { type: String, default: null },
    txRef: { type: String, default: null },

    review: {
      rating: { type: Number, min: 0, max: 5 },
      comment: { type: String },
    },

    metadata: { type: Schema.Types.Mixed },

    // ✅ Review & Escrow tracking
    customerReviewed: { type: Boolean, default: false },
    proReviewed: { type: Boolean, default: false },
    paymentReleased: { type: Boolean, default: false },
    settledAt: { type: Date },
  },
  { timestamps: true }
);

BookingSchema.index({ customerId: 1 });
BookingSchema.index({ proId: 1 });
BookingSchema.index({ status: 1, paymentStatus: 1 });

export default model("Booking", BookingSchema);
