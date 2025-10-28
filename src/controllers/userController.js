const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ msg: 'User with this email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save the new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

    res.status(201).json({
      msg: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
      token
    });

  } catch (error) {
    console.error('Error in user registration:', error);
    res.status(500).json({ msg: 'Server error during registration' });
  }
};

// Log in a user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

    res.status(200).json({
      msg: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token
    });

  } catch (error) {
    console.error('Error in user login:', error);
    res.status(500).json({ msg: 'Server error during login' });
  }
};

module.exports = {
  registerUser,
  loginUser,
};