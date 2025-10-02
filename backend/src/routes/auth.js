const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// User credentials (in production, these should be stored securely in a database)
const USER_CREDENTIALS = {
  'snpelec@gmail.com': {
    password: 'tech123',
    role: 'admin',
    name: 'SNP Admin'
  },
  'snpsnp989@gmail.com': {
    password: 'tech123',
    role: 'technician',
    name: 'Simon Potter'
  }
};

// JWT secret (in production, use environment variable)
const JWT_SECRET = 'snp-electrical-admin-secret-key-2024';

// Login endpoint
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validate credentials
  const user = USER_CREDENTIALS[email];
  if (user && user.password === password) {
    // Generate JWT token
    const token = jwt.sign(
      { 
        email: email,
        role: user.role,
        name: user.name,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: token,
      email: email,
      role: user.role,
      name: user.name,
      message: 'Login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }
});

// Verify token endpoint
router.post('/verify', (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
