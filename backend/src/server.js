const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prisma = require('./utils/prisma');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const { authMiddleware } = require('./middleware/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — restrict to frontend origin only
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));



// Auth Routes (public)
app.use('/api/auth', authRoutes);

// Protected API Routes — require JWT
app.use('/api', authMiddleware, apiRoutes);

// Healthcheck
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
