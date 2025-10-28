// backend/src/models/Payments.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    type: {
      type: String,
      enum: ["booking", "subscription", "boost"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    reference: { type: String, unique: true, required: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
