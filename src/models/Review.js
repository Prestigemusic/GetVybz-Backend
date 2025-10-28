import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewerRole: {
      type: String,
      enum: ["customer", "pro"],
      required: true,
    },
    targetRole: {
      type: String,
      enum: ["customer", "pro"],
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Ensure one review per direction per booking
reviewSchema.index({ bookingId: 1, reviewerId: 1, targetId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
