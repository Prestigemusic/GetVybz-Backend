import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: { type: String, required: true },
    scheduledDate: { type: Date },
    location: { type: String },
    price: { type: Number },
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "canceled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);
export default Job;