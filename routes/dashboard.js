const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Dashboard is protected
router.get('/', protect, getDashboard);

module.exports = router;
