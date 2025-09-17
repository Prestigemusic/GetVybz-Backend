const express = require('express');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/profile/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({
      id: user.id,
      name: user.name,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;