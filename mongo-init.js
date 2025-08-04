// MongoDB initialization script for L&A Logistics
// This script will run when the MongoDB container starts for the first time

// Switch to the lalogistics database
db = db.getSiblingDB('lalogistics');

// Create an admin user for the application
db.users.insertOne({
  name: "System Administrator",
  email: "admin@lalogistics.com",
  password: "$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // This should be a hashed password
  role: "admin",
  employeeNumber: "LA2025-000001",
  createdAt: new Date()
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ employeeNumber: 1 }, { unique: true });
db.spxaudits.createIndex({ dateScanned: 1 });
db.flashexpressaudits.createIndex({ dateScanned: 1 });
db.lostparcels.createIndex({ trackingNumber: 1 }, { unique: true });
db.lostparcels.createIndex({ dateTimeScanned: 1 });

print("L&A Logistics database initialized successfully!");
print("Default admin user created: admin@lalogistics.com");
print("Please change the admin password after first login!");
