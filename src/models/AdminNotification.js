import mongoose from "mongoose";

const AdminNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "RECONCILIATION_ISSUE",
        "DISPUTE_ALERT",
        "PAYMENT_ERROR",
        "SYSTEM_EVENT",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    relatedIds: { type: Object, default: {} },
    read: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

AdminNotificationSchema.index({ createdAt: -1 });

const AdminNotification =
  mongoose.models.AdminNotification ||
  mongoose.model("AdminNotification", AdminNotificationSchema);

export default AdminNotification;
