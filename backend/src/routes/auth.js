const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register — Create first admin user (only works if no users exist)
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Only allow registration if no users exist (first-time setup)
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ error: 'Registration disabled. An admin already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'admin'
      }
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token, 
      user: { id: user.id, username: user.username, role: user.role } 
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me — Validate token & return user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    res.json({ 
      user: { id: user.id, username: user.username, role: user.role } 
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

// GET /api/auth/status — Check if setup is needed (no users yet)
router.get('/status', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ needsSetup: userCount === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
