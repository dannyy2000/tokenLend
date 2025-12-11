const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * Public Routes
 */

// POST /api/auth/signup - Create new account
router.post('/signup', signup);

// POST /api/auth/login - Login to existing account
router.post('/login', login);

/**
 * Protected Routes (require authentication)
 */

// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, getMe);

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticate, updateProfile);

// PUT /api/auth/password - Change password
router.put('/password', authenticate, changePassword);

module.exports = router;
