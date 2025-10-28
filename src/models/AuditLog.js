// src/models/AuditLog.js
import mongoose from "mongoose";

/**
 * Lightweight audit log for actions taken by system/admin/users.
 * Stores action name, actor, timestamp, and optional metadata.
 */
const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null => system
    action: { type: String, required: true },
    disputeId: { type: mongoose.Schema.Types.ObjectId, ref: "Dispute", default: null },
    meta: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// index for quick lookup
AuditLogSchema.index({ disputeId: 1 });
AuditLogSchema.index({ actor: 1 });
AuditLogSchema.index({ action: 1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
