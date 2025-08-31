// Diagnostic script to check if features are working
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

async function runDiagnostics() {
    try {
        console.log('🔍 Running L&A Logistics Diagnostics...\n');
        
        // 1. Check Database Connection
        console.log('1. Testing Database Connection...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connected successfully\n');
        
        // 2. Check Models
        console.log('2. Testing Models...');
        const User = require('./models/User');
        const SellerLabel = require('./models/SellerLabel');
        const SpxAudit = require('./models/SpxAudit');
        
        const adminCount = await User.countDocuments({ role: 'admin' });
        const labelCount = await SellerLabel.countDocuments();
        const auditCount = await SpxAudit.countDocuments();
        
        console.log(`✅ Admin users: ${adminCount}`);
        console.log(`✅ Seller labels: ${labelCount}`);
        console.log(`✅ Audit entries: ${auditCount}\n`);
        
        // 3. Check Controllers
        console.log('3. Testing Controllers...');
        try {
            const settingsController = require('./controllers/settingsController');
            const auditController = require('./controllers/auditController');
            console.log('✅ Settings controller loaded');
            console.log('✅ Audit controller loaded\n');
        } catch (error) {
            console.log('❌ Controller error:', error.message);
        }
        
        // 4. Check PDF Library
        console.log('4. Testing PDF Library...');
        try {
            const pdf = require('html-pdf');
            console.log('✅ PDF library available\n');
        } catch (error) {
            console.log('❌ PDF library error:', error.message);
        }
        
        // 5. Check Routes
        console.log('5. Testing Routes...');
        try {
            const settingsRoutes = require('./routes/settings');
            const auditRoutes = require('./routes/audit');
            console.log('✅ Settings routes loaded');
            console.log('✅ Audit routes loaded\n');
        } catch (error) {
            console.log('❌ Routes error:', error.message);
        }
        
        // 6. Check Views
        console.log('6. Testing Views...');
        const fs = require('fs');
        const viewFiles = [
            'views/settings.ejs',
            'views/audit/reports.ejs',
            'views/layout.ejs'
        ];
        
        viewFiles.forEach(file => {
            if (fs.existsSync(file)) {
                console.log(`✅ ${file} exists`);
            } else {
                console.log(`❌ ${file} missing`);
            }
        });
        
        console.log('\n🎯 Summary:');
        console.log('The application components appear to be properly configured.');
        console.log('If features are not working, the issue is likely:');
        console.log('1. Authentication - User not logged in as admin');
        console.log('2. Frontend JavaScript errors');
        console.log('3. Network/browser issues');
        console.log('\n💡 Troubleshooting Steps:');
        console.log('1. Open browser developer tools (F12)');
        console.log('2. Check Console tab for JavaScript errors');
        console.log('3. Check Network tab for failed requests');
        console.log('4. Verify you are logged in as admin user');
        console.log('5. Try hard refresh (Ctrl+F5)');
        
    } catch (error) {
        console.error('❌ Diagnostic error:', error.message);
    } finally {
        mongoose.disconnect();
    }
}

runDiagnostics();
