const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // You can add other fields here, like a link to their profile
  // profile: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Profile',
  // },
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);
module.exports = User;