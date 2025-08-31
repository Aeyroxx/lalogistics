const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// @desc    Get all employees
// @route   GET /employees
// @access  Private/Admin
const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' }).select('-password');
    
    res.render('employees/index', {
      employees,
      user: req.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Server error',
      error
    });
  }
};

// @desc    Get employee by ID
// @route   GET /employees/:id
// @access  Private/Admin or Self
const getEmployeeById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).render('error', {
        message: 'Employee not found',
        error: {}
      });
    }

    // Check if logged in user is admin or self
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).render('error', {
        message: 'Not authorized to view this profile',
        error: {}
      });
    }

    const profile = await EmployeeProfile.findOne({ user: req.params.id });

    res.render('employees/view', {
      employee: user, // Use employee instead of user to match template
      user: req.user, // Current logged-in user
      profile,
      isAdmin: req.user.role === 'admin',
      isSelf: req.user._id.toString() === req.params.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Server error',
      error
    });
  }
};

// @desc    Show form to create/edit employee profile
// @route   GET /employees/:id/edit
// @access  Private/Admin or Self
const getEditEmployeeForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).render('error', {
        message: 'Employee not found',
        error: {}
      });
    }

    // Check if logged in user is admin or self
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).render('error', {
        message: 'Not authorized to edit this profile',
        error: {}
      });
    }

    const profile = await EmployeeProfile.findOne({ user: req.params.id });

    res.render('employees/edit', {
      employee: user, // Fix: template expects 'employee' not 'user'
      user: req.user,  // Current logged-in user
      profile,
      isAdmin: req.user.role === 'admin',
      isSelf: req.user._id.toString() === req.params.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Server error',
      error
    });
  }
};

// @desc    Create/Update employee profile
// @route   POST /employees/:id
// @access  Private/Admin or Self
const updateEmployeeProfile = async (req, res) => {
  try {
    console.log('=== UPDATE EMPLOYEE PROFILE ===');
    console.log('Employee ID:', req.params.id);
    console.log('Request body keys:', Object.keys(req.body));
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).render('error', {
        message: 'Employee not found',
        error: {}
      });
    }

    // Check if logged in user is admin or self
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).render('error', {
        message: 'Not authorized to update this profile',
        error: {}
      });
    }

    // Extract basic fields from form
    const name = req.body.name || user.name;
    const email = req.body.email || user.email;
    const phone = req.body.phone || '';
    const position = req.body.position || '';
    const department = req.body.department || '';
    const address = req.body.address || '';

    // Update user's basic information
    const userUpdateData = { name, email };
    await User.findByIdAndUpdate(req.params.id, userUpdateData);
    console.log('Updated user basic info:', userUpdateData);

    // Find or create employee profile
    let profile = await EmployeeProfile.findOne({ user: req.params.id });

    if (profile) {
      console.log('Updating existing profile for user:', req.params.id);
      // Only update the fields that were provided, keep existing data for others
      const updateFields = {
        phoneNumber: phone,
        position: position,
        department: department,
        'address.street': address,
        updatedAt: Date.now()
      };
      
      // Only update non-empty fields
      Object.keys(updateFields).forEach(key => {
        if (updateFields[key] === '' && key !== 'updatedAt') {
          delete updateFields[key];
        }
      });
      
      await EmployeeProfile.findByIdAndUpdate(profile._id, updateFields);
      console.log('Profile updated with fields:', updateFields);
    } else {
      console.log('Creating new profile for user:', req.params.id);
      const profileData = {
        user: req.params.id,
        phoneNumber: phone,
        position: position,
        department: department,
        address: {
          street: address,
          city: '',
          state: '',
          zipCode: '',
          country: ''
        },
        backgroundInfo: {
          education: '',
          previousEmployment: '',
          skills: []
        },
        personalInfo: {
          birthdate: null,
          gender: '',
          civilStatus: '',
          nationality: ''
        },
        socialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: ''
        },
        parentsInfo: {
          fatherName: '',
          fatherOccupation: '',
          fatherContact: '',
          motherName: '',
          motherOccupation: '',
          motherContact: ''
        },
        tinId: '',
        identificationCards: {
          primary: '',
          secondary: ''
        },
        updatedAt: Date.now()
      };
      
      profile = new EmployeeProfile(profileData);
      await profile.save();
      console.log('New profile created');
    }

    console.log('Redirecting to employee profile...');
    res.redirect(`/employees/${req.params.id}`);
  } catch (error) {
    console.error('=== UPDATE EMPLOYEE PROFILE ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).render('error', { 
      message: 'Error updating employee profile: ' + error.message,
      error
    });
  }
};

// @desc    Upload profile picture
// @route   POST /employees/:id/upload-profile-picture
// @access  Private/Admin or Self
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const profile = await EmployeeProfile.findOne({ user: req.params.id });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Update profile with new picture
    profile.profilePicture = req.file.filename;
    await profile.save();

    res.redirect(`/employees/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// @desc    Upload ID documents
// @route   POST /employees/:id/upload-ids
// @access  Private/Admin or Self
const uploadIdDocuments = async (req, res) => {
  try {
    if (!req.files || !req.files.primaryId || !req.files.secondaryId) {
      return res.status(400).json({ message: 'Please upload both ID documents' });
    }

    const profile = await EmployeeProfile.findOne({ user: req.params.id });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Update profile with new ID documents
    profile.identificationCards = {
      primary: req.files.primaryId[0].filename,
      secondary: req.files.secondaryId[0].filename
    };
    
    await profile.save();

    res.redirect(`/employees/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// @desc    Delete an employee
// @route   DELETE /employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
  try {
    console.log('=== DELETE EMPLOYEE REQUEST ===');
    console.log('Employee ID:', req.params.id);
    console.log('User role:', req.user.role);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('Access denied: User is not admin');
      return res.status(403).json({ message: 'Not authorized as admin' });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      console.log('Employee not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log('Found employee:', user.name, user.email);

    // Delete associated profile
    const profile = await EmployeeProfile.findOne({ user: req.params.id });
    if (profile) {
      console.log('Found employee profile, deleting associated files...');
      // Delete profile picture if exists and not default
      if (profile.profilePicture && profile.profilePicture !== 'default-profile.jpg') {
        const profilePicPath = path.join(__dirname, '../public/uploads/profile/', profile.profilePicture);
        if (fs.existsSync(profilePicPath)) {
          fs.unlinkSync(profilePicPath);
          console.log('Deleted profile picture:', profile.profilePicture);
        }
      }

      // Delete ID card images if exist
      if (profile.identificationCards) {
        if (profile.identificationCards.primary) {
          const primaryIdPath = path.join(__dirname, '../public/uploads/ids/', profile.identificationCards.primary);
          if (fs.existsSync(primaryIdPath)) {
            fs.unlinkSync(primaryIdPath);
          }
        }

        if (profile.identificationCards.secondary) {
          const secondaryIdPath = path.join(__dirname, '../public/uploads/ids/', profile.identificationCards.secondary);
          if (fs.existsSync(secondaryIdPath)) {
            fs.unlinkSync(secondaryIdPath);
          }
        }
      }

      console.log('Deleting employee profile...');
      await profile.deleteOne();
      console.log('Employee profile deleted');
    } else {
      console.log('No employee profile found');
    }

    // Finally delete user
    console.log('Deleting user account...');
    await user.deleteOne();
    console.log('User account deleted');

    console.log('Employee deletion completed successfully');
    res.json({ message: 'Employee removed' });
  } catch (error) {
    console.error('=== DELETE EMPLOYEE ERROR ===');
    console.error('Error details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get new employee form
// @route   GET /employees/new
// @access  Private/Admin
const getNewEmployeeForm = async (req, res) => {
  try {
    res.render('employees/new', {
      user: req.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Server error',
      error
    });
  }
};

// @desc    Create new employee
// @route   POST /employees
// @access  Private/Admin
const createEmployee = async (req, res) => {
  console.log('=== EMPLOYEE CREATION STARTED ===');
  console.log('Request body:', req.body);
  console.log('User creating employee:', req.user.name);
  
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      console.log('Validation failed: missing required fields');
      return res.status(400).render('employees/new', {
        error: 'Please fill all required fields (Name, Email, Password)',
        user: req.user
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).render('employees/new', {
        error: 'User with this email already exists',
        user: req.user
      });
    }
    
    console.log('Creating new user...');
    
    // Create new user - employeeNumber will be auto-generated by the model
    const user = await User.create({
      name,
      email,
      password,
      role: 'employee'
    });
    
    console.log('Successfully created employee:', user.employeeNumber, 'ID:', user._id);
    
    console.log('Creating EmployeeProfile...');
    
    // Create a basic EmployeeProfile with placeholder values
    // These can be updated later through the employee edit form
    try {
      const profile = await EmployeeProfile.create({
        user: user._id,
        phoneNumber: 'Not provided', // Required field - placeholder
        tinId: 'Not provided', // Required field - placeholder
        identificationCards: {
          primary: 'Not provided', // Required field - placeholder
          secondary: 'Not provided' // Required field - placeholder
        },
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        },
        personalInfo: {
          birthdate: null,
          gender: '',
          civilStatus: '',
          nationality: ''
        }
      });
      
      console.log('Successfully created EmployeeProfile:', profile._id, 'for user:', user.name);
    } catch (profileError) {
      console.error('ERROR creating EmployeeProfile:', profileError.message);
      console.error('Profile validation errors:', profileError.errors);
      console.error('Full profile error:', profileError);
      // Don't fail the entire operation, but log the error
    }
    
    console.log('=== EMPLOYEE CREATION COMPLETED ===');
    res.redirect('/employees');
  } catch (error) {
    console.error('Employee creation error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).render('employees/new', {
      error: 'Error creating employee: ' + error.message,
      user: req.user
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getEditEmployeeForm,
  updateEmployeeProfile,
  uploadProfilePicture,
  uploadIdDocuments,
  deleteEmployee,
  getNewEmployeeForm,
  createEmployee
};
