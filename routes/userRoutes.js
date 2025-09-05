const express = require('express');
const router = express.Router();
const { registerUser } = require('./controllers/userController');

// The route for user registration
router.post('/signup', registerUser);

module.exports = router;