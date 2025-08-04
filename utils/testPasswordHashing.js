const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for testing'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple function to test password hashing and comparison
const testPasswordHashing = async () => {
  try {
    // Create a plain password
    const plainPassword = 'password123';
    
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    console.log('Plain password:', plainPassword);
    console.log('Hashed password:', hashedPassword);
    
    // Compare passwords
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('Password match result:', match);
    
    // Test password from database
    const User = require('../models/User');
    const testUser = await User.findOne({ email: 'test@lalogistics.com' });
    
    if (testUser) {
      console.log('\nFound test user:', testUser.email);
      console.log('Stored hashed password:', testUser.password);
      
      // Test correct password
      const correctMatch = await bcrypt.compare('password123', testUser.password);
      console.log('Correct password match:', correctMatch);
      
      // Test wrong password
      const wrongMatch = await bcrypt.compare('wrongpassword', testUser.password);
      console.log('Wrong password match:', wrongMatch);
    } else {
      console.log('Test user not found');
    }
    
  } catch (error) {
    console.error('Error testing password:', error);
  } finally {
    mongoose.disconnect();
  }
};

testPasswordHashing();
