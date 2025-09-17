const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure this path points to your User model

const router = express.Router();

// Middleware to check JWT
function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
}

// ✅ Protected profile for the logged-in user
// GET /api/auth/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Public profile by ID
// GET /api/profile/:id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    name: "DJ Prestige",
    service: "DJ",
    rating: 4.9,
  });
});

module.exports = router;
