// src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  username: {
    type: String,
    default: function () {
      return this.email?.split('@')[0];
    },
  },
  profilePicture: {
    type: String,
    default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  },
  coverPhoto: {
    type: String,
    default: 'https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200',
  },
  bio: { type: String, default: "Hey there! I’m new on GetVybz 🎵" },
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
