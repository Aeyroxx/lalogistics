const express = require('express');
const multer = require('multer');
const { 
  generateQRCode,
  generateIDCard,
  getIdCardGenerationPage
} = require('../controllers/idCardController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for QR code uploads
const upload = multer({
  dest: 'temp/', // Temporary directory
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// All routes are protected and admin only
router.use(protect);
router.use(admin);

// Test route for debugging
router.get('/test', (req, res) => {
  res.json({ message: 'ID card routes are working', user: req.user.name });
});

router.get('/generate/:employeeId', getIdCardGenerationPage);
router.post('/generate-qr/:id', upload.single('qrCode'), generateQRCode);
router.post('/generate/:id', generateIDCard);

module.exports = router;
