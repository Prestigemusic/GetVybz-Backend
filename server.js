const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./src/routes/authRoutes'); // Auth routes with signup/login/profile

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Root check
app.get('/', (req, res) => {
  res.send('✅ GetVybz API is running...');
});

// Connect to MongoDB and start the server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Unable to connect to the database:', err);
    process.exit(1);
  });
