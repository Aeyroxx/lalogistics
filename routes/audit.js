const express = require('express');
const { 
  getAuditForm,
  createAuditEntry,
  getAuditList,
  getAuditReports,
  getAuditById,
  getEditAuditForm,
  updateAuditEntry,
  deleteAuditEntry,
  getSpxImportForm,
  importSpxData,
  exportAuditPDF
} = require('../controllers/auditController');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');

const router = express.Router();

// Configure multer for JSON file uploads
const upload = multer({
  dest: 'temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || 
        file.originalname.toLowerCase().endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed!'), false);
    }
  }
});

// All routes are protected
router.use(protect);

// Form routes
router.get('/', getAuditForm);
router.post('/', createAuditEntry);

// List and report routes
router.get('/list', getAuditList);
router.get('/reports', getAuditReports);
router.get('/export/pdf', admin, exportAuditPDF);

// SPX Import routes (admin only)
router.get('/import/spx', admin, getSpxImportForm);
router.post('/import/spx', admin, upload.single('jsonFile'), importSpxData);

// View, edit, update, delete routes
router.get('/:type/:id', getAuditById);
router.get('/:type/:id/edit', admin, getEditAuditForm);
router.put('/:type/:id', admin, updateAuditEntry);
router.delete('/:type/:id', admin, deleteAuditEntry);

module.exports = router;
