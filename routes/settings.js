const express = require('express');
const {
  getSettings,
  createSellerLabel,
  updateSellerLabel,
  deleteSellerLabel,
  getSellerLabelsAPI,
  applyLabelsToExistingEntries
} = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected and require admin
router.use(protect);

// Settings page
router.get('/', admin, getSettings);

// Seller label management
router.post('/seller-labels', admin, createSellerLabel);
router.put('/seller-labels/:id', admin, updateSellerLabel);
router.delete('/seller-labels/:id', admin, deleteSellerLabel);

// Bulk apply labels to existing entries
router.post('/apply-labels', admin, applyLabelsToExistingEntries);

// API routes for autocomplete (accessible to all authenticated users)
router.get('/api/seller-labels', getSellerLabelsAPI);

module.exports = router;
