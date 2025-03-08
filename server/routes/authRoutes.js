const express = require('express');
const { googleLogin, getCurrentUser } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/google - Google OAuth login
router.post('/google', googleLogin);

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;