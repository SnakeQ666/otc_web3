const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('../config/database');
const authRoutes = require('./routes/authRoutes');
const kycRoutes = require('./routes/kycRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { User } = require('./models');
require('dotenv').config({ path: '../.env.development' });

const app = express();

console.log("CORS origin:", process.env.CORS_ORIGIN);
// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Static file serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/orders',orderRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Requested resource not found' });
});

// Start server
const startServer = async () => {
  try {
    // Synchronize database models, do not force table recreation
    await sequelize.sync();
    console.log('Database synchronized successfully');

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`CORS is configured to allow requests from ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();