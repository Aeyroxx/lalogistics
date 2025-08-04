const express = require('express');
const { 
  getAllEmployees, 
  getEmployeeById, 
  getEditEmployeeForm, 
  updateEmployeeProfile, 
  uploadProfilePicture, 
  uploadIdDocuments,
  deleteEmployee,
  getNewEmployeeForm,
  createEmployee
} = require('../controllers/employeeController');
const { protect, admin } = require('../middleware/authMiddleware');
const { profileUpload, idUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Admin only routes
router.get('/', admin, getAllEmployees);
router.get('/new', admin, getNewEmployeeForm);
router.post('/', admin, createEmployee);
router.delete('/:id', admin, deleteEmployee);

// Admin or self routes
router.get('/:id', getEmployeeById);
router.get('/:id/edit', getEditEmployeeForm);
router.post('/:id', updateEmployeeProfile);

// File upload routes
router.post('/:id/upload-profile-picture', profileUpload, uploadProfilePicture);
router.post('/:id/upload-ids', idUpload, uploadIdDocuments);

module.exports = router;
