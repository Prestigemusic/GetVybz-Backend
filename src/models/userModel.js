import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ["customer", "pro"], default: "customer" },
  avatarUri: String,
  bio: String,
  services: [String],
  location: String,
  rating: Number,
  verified: { type: Boolean, default: false },
}, { timestamps: true });

// ✅ Prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;