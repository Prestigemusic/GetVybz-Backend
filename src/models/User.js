// src/models/User.js
import mongoose from "mongoose";

// -------------------- Rate Schema --------------------
const RateSchema = new mongoose.Schema({
  label: { type: String, required: true },
  price: { type: Number, required: true },
});

// -------------------- Review Schema --------------------
const ReviewSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewerRole: { type: String, enum: ["customer", "pro"], required: true },
  targetRole: { type: String, enum: ["customer", "pro"], required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// -------------------- Subscription / Payment Schema --------------------
const SubscriptionSchema = new mongoose.Schema({
  type: { type: String, enum: ["verification", "boost", "premium"], required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["paystack", "bank_transfer", "card", "flutterwave"], required: true },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  reference: { type: String },
});

// -------------------- Booking Schema --------------------
const BookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pro: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Confirmed", "Cancelled", "completed"], default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

// -------------------- Pro Availability Schema --------------------
const AvailabilitySchema = new mongoose.Schema({
  day: { type: String, required: true },
  slots: [{ type: String }],
});

// -------------------- Main User Schema --------------------
const UserSchema = new mongoose.Schema(
  {
    // Basic Info
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["customer", "pro", "admin"], default: "customer" },

    // Profile visuals
    avatarUri: { type: String, default: "" },
    bannerUri: { type: String, default: "" },
    bio: { type: String, default: "" },
    services: [String],
    rateCard: [RateSchema],
    gallery: [String],

    // Booking & availability
    availability: [AvailabilitySchema],
    bookings: [BookingSchema],
    location: { type: String, default: "" },

    // Reviews
    reviews: [ReviewSchema],

    // Monetization / Subscription
    isVerified: { type: Boolean, default: false },
    isBoosted: { type: Boolean, default: false },
    boostExpiry: { type: Date, default: null },
    subscriptions: [SubscriptionSchema],

    // Pro-specific fields
    category: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    verifiedDate: { type: Date, default: null },

    // Trust, Verification & Matching Fields
    trustScore: { type: Number, default: 50 },
    disputesCount: { type: Number, default: 0 },
    emailVerified: { type: Boolean, default: false },
    idVerified: { type: Boolean, default: false },
    paymentVerified: { type: Boolean, default: false },
    socialLinked: { type: Boolean, default: false },
    skills: { type: [String], default: [] },
    rate: { type: Number, default: 0 },
    embedding: { type: [Number], default: [] },

    // Booking tracking
    bookingsCompleted: { type: Number, default: 0 },
    bookingsTotal: { type: Number, default: 0 },

    // Gamification & Loyalty
    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    tier: { type: String, enum: ["Bronze", "Silver", "Gold", "Platinum"], default: "Bronze" },
    referrals: { type: Number, default: 0 },

    // Created timestamp
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Remove password from JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Hot-reload safe export
const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
