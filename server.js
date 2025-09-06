const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./models');
const authRoutes = require('./routes/auth'); // FIXED - updated
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes); // FIXED
app.use('/api/profile', profileRoutes);

// Sync database and start server
db.sequelize.sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });