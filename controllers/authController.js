const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Login user & get token
// @route   POST /login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // Create session
      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      // Create token
      const token = generateToken(user._id);

      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      return res.redirect('/dashboard');
    } else {
      return res.render('login', {
        error: 'Invalid email or password',
        email: email,
        layout: false
      });
    }
  } catch (error) {
    console.error(error);
    return res.render('login', {
      error: 'Server error',
      email: req.body.email,
      layout: false
    });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /logout
// @access  Private
const logout = (req, res) => {
  req.session.destroy();
  res.clearCookie('token');
  res.redirect('/login');
};

// @desc    Get login page
// @route   GET /login
// @access  Public
const getLoginPage = (req, res) => {
  // Check if already logged in
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null, email: '', layout: false });
};

// @desc    Register a new user (admin only)
// @route   POST /register
// @access  Private/Admin
const registerUser = async (req, res) => {
  try {
    const { name, email, password, employeeNumber, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      employeeNumber,
      role: role || 'employee'
    });

    if (user) {
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeNumber: user.employeeNumber,
        role: user.role
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  login,
  logout,
  getLoginPage,
  registerUser
};
