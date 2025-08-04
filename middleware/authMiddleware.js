const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check if user is authenticated via session
  if (req.session && req.session.user) {
    try {
      req.user = await User.findById(req.session.user._id);
      res.locals.user = req.user;
      res.locals.path = req.path;
      return next();
    } catch (error) {
      return res.status(401).render('error', {
        message: 'Not authorized, session invalid',
        error: {}
      });
    }
  }

  // Check for JWT in cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // If no token in cookie, check for token in headers
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).render('login', {
      message: 'Not authorized, please log in',
      error: {}
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');
    res.locals.user = req.user;
    res.locals.path = req.path;
    next();
  } catch (error) {
    return res.status(401).render('login', {
      message: 'Not authorized, token failed',
      error: {}
    });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).render('error', {
      message: 'Not authorized as admin',
      error: {}
    });
  }
};

module.exports = { protect, admin };
