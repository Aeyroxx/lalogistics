const express = require('express');
const { 
  getLostParcelForm,
  createLostParcel,
  getLostParcelById,
  getAllLostParcels,
  deleteLostParcel,
  updateBarcodeImage,
  getEditLostParcelForm,
  updateLostParcel
} = require('../controllers/lostParcelController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Form routes
router.get('/add', getLostParcelForm);
router.post('/', createLostParcel);

// View routes
router.get('/', getAllLostParcels);
router.get('/view/:id', getLostParcelById);
router.get('/:id', getLostParcelById); // Add direct ID route for backwards compatibility

// Update barcode route
router.post('/:id/barcode', updateBarcodeImage);

// Edit routes (admin only)
router.get('/:id/edit', admin, getEditLostParcelForm);
router.put('/:id', admin, updateLostParcel);

// Admin only routes
router.delete('/:id', admin, deleteLostParcel);

module.exports = router;
