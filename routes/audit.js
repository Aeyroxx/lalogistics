const express = require('express');
const { 
  getAuditForm,
  createAuditEntry,
  getAuditList,
  getAuditReports,
  getAuditById,
  getEditAuditForm,
  updateAuditEntry,
  deleteAuditEntry
} = require('../controllers/auditController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Form routes
router.get('/', getAuditForm);
router.post('/', createAuditEntry);

// List and report routes
router.get('/list', getAuditList);
router.get('/reports', getAuditReports);

// View, edit, update, delete routes
router.get('/:type/:id', getAuditById);
router.get('/:type/:id/edit', admin, getEditAuditForm);
router.put('/:type/:id', admin, updateAuditEntry);
router.delete('/:type/:id', admin, deleteAuditEntry);

module.exports = router;
