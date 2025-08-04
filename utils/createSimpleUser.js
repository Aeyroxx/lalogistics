const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for creating simple user'))
  .catch(err => console.error('MongoDB connection error:', err));

const User = require('../models/User');

const createSimpleUser = async () => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'simple@lalogistics.com' });
    
    if (existingUser) {
      console.log('User already exists, deleting...');
      await User.deleteOne({ email: 'simple@lalogistics.com' });
    }
    
    // Create user with simple password
    const user = new User({
      employeeNumber: 'SIMPLE001',
      name: 'Simple User',
      email: 'simple@lalogistics.com',
      password: '12345', // This will be hashed by the pre-save hook
      role: 'admin'
    });
    
    await user.save();
    console.log('Simple user created:');
    console.log('Email: simple@lalogistics.com');
    console.log('Password: 12345');
    
    // Test password matching directly
    const foundUser = await User.findOne({ email: 'simple@lalogistics.com' });
    const isMatch = await foundUser.matchPassword('12345');
    console.log('Password match test:', isMatch);
    
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    mongoose.disconnect();
  }
};

createSimpleUser();
