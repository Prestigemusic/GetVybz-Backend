import mongoose from "mongoose";

const TrustScoreSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    score: { type: Number, default: 0 }, // 0–100
    breakdown: {
      trust: { type: Number, default: 0 },     // verification
      feedback: { type: Number, default: 0 },  // ratings
      booking: { type: Number, default: 0 },   // completion
      system: { type: Number, default: 0 },    // disputes, flags, etc.
    },
    lastCalculatedAt: { type: Date, default: Date.now },
    previousScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("TrustScore", TrustScoreSchema);
