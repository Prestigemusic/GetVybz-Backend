// BACKEND: src/models/User.js
import mongoose from "mongoose";

const RateSchema = new mongoose.Schema({
  label: String,
  price: Number,
});

const ReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating: Number,
  comment: String,
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "pro", "admin"], default: "customer" },
  avatarUri: String,
  bannerUri: String,
  bio: String,
  services: [String],
  rateCard: [RateSchema],
  gallery: [String],
  bookingDates: mongoose.Schema.Types.Mixed,
  location: String,
  reviews: [ReviewSchema],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);
export default User;
