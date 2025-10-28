import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    amount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    gateway: {
      type: String,
      enum: ["paystack", "flutterwave", "manual"],
      default: "paystack",
    },
    startDate: Date,
    nextBillingDate: Date,
    billingCycleDays: {
      type: Number,
      default: 30,
    },
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "inactive"],
      default: "inactive",
    },
    canceledAt: Date,
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
