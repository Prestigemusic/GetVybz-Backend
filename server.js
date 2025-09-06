const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./models');
const userRoutes = require('./routes/userRoutes'); // Corrected import
const profileRoutes = require('./routes/profile'); // New route

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', userRoutes); // Make sure this is linked to userRoutes
app.use('/api/profile', profileRoutes); // Use the new profile routes

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