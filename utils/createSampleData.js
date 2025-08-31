const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const SpxAudit = require('../models/SpxAudit');
const FlashExpressAudit = require('../models/FlashExpressAudit');
const LostParcel = require('../models/LostParcel');

// Helper function to generate employee number
const generateEmployeeNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-5); // Last 5 digits
  return `LA${year}-${month}${timestamp}`;
};

const createSampleData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for sample data creation');

    // Check if we already have employees
    const existingEmployees = await User.find({ role: 'employee' });
    console.log(`Found ${existingEmployees.length} existing employees`);

    // Create sample employees if none exist
    if (existingEmployees.length === 0) {
      console.log('Creating sample employees...');
      
      const sampleEmployees = [
        {
          name: 'Juan Dela Cruz',
          email: 'juan.delacruz@lalogistics.com',
          password: 'password123',
          role: 'employee'
        },
        {
          name: 'Maria Santos',
          email: 'maria.santos@lalogistics.com',
          password: 'password123',
          role: 'employee'
        },
        {
          name: 'Pedro Garcia',
          email: 'pedro.garcia@lalogistics.com',
          password: 'password123',
          role: 'employee'
        }
      ];

      for (const employeeData of sampleEmployees) {
        // Create user
        const hashedPassword = await bcrypt.hash(employeeData.password, 10);
        const user = await User.create({
          name: employeeData.name,
          email: employeeData.email,
          password: hashedPassword,
          role: employeeData.role,
          employeeNumber: generateEmployeeNumber()
        });

        // Create employee profile
        await EmployeeProfile.create({
          user: user._id,  // Fixed: use 'user' instead of 'userId'
          phoneNumber: '+63912345' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
          address: {
            street: 'Sample Street ' + Math.floor(Math.random() * 100),
            city: 'Metro Manila',
            state: 'NCR',
            zipCode: '1000',
            country: 'Philippines'
          },
          position: 'Logistics Coordinator',
          department: 'Operations',
          hireDate: new Date(),
          emergencyContact: {
            name: 'Emergency Contact',
            relationship: 'Family',
            phoneNumber: '+63912345' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')
          }
        });

        console.log(`Created employee: ${employeeData.name} (${user.employeeNumber})`);
      }
    }

    // Create sample audit entries
    const existingAudits = await SpxAudit.countDocuments();
    console.log(`Found ${existingAudits} existing SPX audits`);

    if (existingAudits === 0) {
      console.log('Creating sample audit entries...');
      
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        // Create SPX audit entries
        const spxAudits = [
          {
            date: new Date('2025-08-01'),
            taskId: 'LA-20250801-12345',
            sellerId: 'SELLER001',
            shopId: 'SHOP001',
            numberOfParcels: 75,
            handedOverWithinSLA: true,
            amount: 0,
            penalties: 0,
            notes: 'Sample SPX audit entry',
            createdBy: adminUser._id
          },
          {
            date: new Date('2025-08-02'),
            taskId: 'LA-20250802-12346',
            sellerId: 'SELLER002',
            shopId: 'SHOP002',
            numberOfParcels: 120,
            handedOverWithinSLA: false,
            amount: 0,
            penalties: 5,
            notes: 'Sample SPX audit entry with penalty',
            createdBy: adminUser._id
          },
          {
            date: new Date('2025-08-03'),
            taskId: 'LA-20250803-12347',
            sellerId: 'SELLER003',
            shopId: 'SHOP003',
            numberOfParcels: 95,
            handedOverWithinSLA: true,
            amount: 0,
            penalties: 0,
            notes: 'Sample SPX audit entry',
            createdBy: adminUser._id
          }
        ];

        for (const auditData of spxAudits) {
          const audit = await SpxAudit.create(auditData);
          console.log(`Created SPX audit: ${audit.taskId} - ₱${audit.calculatedEarnings}`);
        }

        // Create Flash Express audit entries
        const flashAudits = [
          {
            date: new Date('2025-08-01'),
            taskId: 'LA-20250801-22345',
            sellerId: 'FLASH_SELLER001',
            numberOfParcels: 25,
            amount: 75,
            createdBy: adminUser._id
          },
          {
            date: new Date('2025-08-02'),
            taskId: 'LA-20250802-22346',
            sellerId: 'FLASH_SELLER002',
            numberOfParcels: 30,
            amount: 90,
            createdBy: adminUser._id
          }
        ];

        for (const auditData of flashAudits) {
          const audit = await FlashExpressAudit.create(auditData);
          console.log(`Created Flash audit: ${audit.taskId} - ₱${audit.calculatedEarnings}`);
        }
      }
    }

    // Create sample lost parcels
    const existingLostParcels = await LostParcel.countDocuments();
    console.log(`Found ${existingLostParcels} existing lost parcels`);

    if (existingLostParcels === 0) {
      console.log('Creating sample lost parcels...');
      
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        const lostParcels = [
          {
            trackingNumber: 'SPX123456789',
            courier: 'SPX',
            senderName: 'John Doe',
            senderPhone: '+639123456789',
            receiverName: 'Jane Smith',
            receiverPhone: '+639987654321',
            receiverAddress: '123 Main St, Quezon City',
            packageDescription: 'Electronics - Mobile Phone',
            lastKnownLocation: 'Quezon City Hub',
            dateReported: new Date(),
            status: 'investigating',
            notes: 'Package missing after sorting at QC Hub',
            createdBy: adminUser._id
          },
          {
            trackingNumber: 'FLASH987654321',
            courier: 'Flash Express',
            senderName: 'Maria Garcia',
            senderPhone: '+639111222333',
            receiverName: 'Pedro Santos',
            receiverPhone: '+639444555666',
            receiverAddress: '456 Oak Ave, Makati City',
            packageDescription: 'Documents - Contract Papers',
            lastKnownLocation: 'Makati Distribution Center',
            dateReported: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
            status: 'found',
            notes: 'Package located and delivered successfully',
            createdBy: adminUser._id
          }
        ];

        for (const parcelData of lostParcels) {
          const parcel = await LostParcel.create(parcelData);
          console.log(`Created lost parcel: ${parcel.trackingNumber} (${parcel.status})`);
        }
      }
    }

    console.log('\n✅ Sample data creation completed!');
    console.log('You can now:');
    console.log('- View employees at /employees');
    console.log('- View audit entries at /audit/list');
    console.log('- View reports at /audit/reports');
    console.log('- View lost parcels at /lost-parcels');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample data:', error);
    process.exit(1);
  }
};

createSampleData();
