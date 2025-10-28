// src/models/Dispute.js
import mongoose from "mongoose";

const EvidenceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video", "file", "text"], default: "text" },
    url: { type: String }, // cloudinary / storage url
    note: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DisputeSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    initiatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    respondentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    description: { type: String, default: "" },
    evidence: { type: [EvidenceSchema], default: [] },
    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "cancelled"],
      default: "open",
    },
    resolution: {
      type: String,
      enum: ["refund_customer", "release_pro", "split", "no_action", "other"],
    },
    resolutionNote: { type: String, default: "" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // admin id
    resolvedAt: { type: Date, default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

DisputeSchema.index({ bookingId: 1 });
DisputeSchema.index({ initiatorId: 1 });
DisputeSchema.index({ respondentId: 1 });
DisputeSchema.index({ status: 1, createdAt: -1 });

const Dispute = mongoose.models.Dispute || mongoose.model("Dispute", DisputeSchema);
export default Dispute;
