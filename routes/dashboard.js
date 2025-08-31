const express = require('express');
const { getDashboard, getDashboardReportData } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Dashboard is protected
router.get('/', protect, getDashboard);
router.get('/api/reports', protect, getDashboardReportData);

module.exports = router;
