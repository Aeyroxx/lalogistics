const express = require('express');
const { login, logout, getLoginPage, registerUser } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/login', getLoginPage);
router.post('/login', login);

// Protected routes
router.get('/logout', protect, logout);

// Admin routes
router.post('/register', protect, admin, registerUser);

module.exports = router;
