const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import User model directly from the file (avoid circular dependencies)
const userModelPath = path.join(__dirname, '..', 'models', 'User.js');
const UserModel = require(userModelPath);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => console.error('MongoDB connection error:', err));

const createAdminUser = async () => {
  try {
    // Generate password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create admin user
    const adminUser = new UserModel({
      employeeNumber: 'ADMIN002',
      name: 'Admin Test',
      email: 'test@lalogistics.com',
      password: hashedPassword,
      role: 'admin'
    });
    
    await adminUser.save();
    console.log('New admin user created successfully:');
    console.log('Email: test@lalogistics.com');
    console.log('Password: password123');
    
    // Print all users for debugging
    const users = await UserModel.find({}).select('-password');
    console.log('\nAll users in database:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}), role: ${user.role}, id: ${user._id}`);
    });
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.disconnect();
  }
};

createAdminUser();
