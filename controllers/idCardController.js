const EmployeeProfile = require('../models/EmployeeProfile');
const User = require('../models/User');
const IDCard = require('../models/IDCard');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const htmlPdf = require('html-pdf');

// @desc    Generate QR code for ID card
// @route   POST /id-cards/generate-qr/:id
// @access  Private/Admin
const generateQRCode = async (req, res) => {
  console.log('=== QR CODE GENERATION STARTED ===');
  console.log('Profile ID:', req.params.id);
  
  try {
    const profile = await EmployeeProfile.findById(req.params.id).populate('user');
    
    if (!profile) {
      console.log('Profile not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Employee profile not found' });
    }
    
    console.log('Found profile:', profile._id, 'for user:', profile.user.name);
    
    // If QR code data is provided in the request, use it
    let qrCodeData;
    if (req.body.qrData) {
      qrCodeData = req.body.qrData;
    } else {
      // Generate QR code data: Name + Last 4 digits of employee ID + Start date
      const user = profile.user;
      const employeeId = user.employeeNumber;
      const last4Digits = employeeId.slice(-4);
      const startDate = moment(profile.dateEmployed).format('YYYY-MM-DD');
      qrCodeData = `Name: ${user.name}, ID: ${last4Digits}, Start Date: ${startDate}`;
    }
    
    console.log('QR Code Data:', qrCodeData);
    
    // Generate QR code image filename
    const qrImageName = `qr-${profile.user._id}-${Date.now()}.png`;
    const qrImagePath = path.join(__dirname, '../public/uploads/ids/', qrImageName);
    
    console.log('Saving QR code at:', qrImagePath);
    
    // If QR code file is provided, save it directly
    if (req.file) {
      // Move uploaded file to correct location
      fs.renameSync(req.file.path, qrImagePath);
    } else {
      // Generate QR code using server-side library
      await QRCode.toFile(qrImagePath, qrCodeData, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 200
      });
    }
    
    console.log('QR code file saved successfully');
    
    // Check if ID card already exists
    let idCard = await IDCard.findOne({ employee: profile._id });
    
    if (idCard) {
      console.log('Updating existing ID card:', idCard._id);
      // Delete old QR code if exists
      if (idCard.qrCodeImage) {
        const oldQrPath = path.join(__dirname, '../public/uploads/ids/', idCard.qrCodeImage);
        if (fs.existsSync(oldQrPath)) {
          fs.unlinkSync(oldQrPath);
          console.log('Deleted old QR code:', oldQrPath);
        }
      }
      
      // Update existing ID card
      idCard.qrCodeData = qrCodeData;
      idCard.qrCodeImage = qrImageName;
      await idCard.save();
    } else {
      console.log('Creating new ID card');
      // Create new ID card
      idCard = await IDCard.create({
        employee: profile._id,
        qrCodeData,
        qrCodeImage: qrImageName,
        cardImage: '' // Will be updated after card generation
      });
    }
    
    console.log('=== QR CODE GENERATION COMPLETED ===');
    res.json({
      message: 'QR code generated successfully',
      qrImageUrl: `/uploads/ids/${qrImageName}`,
      idCardId: idCard._id
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Generate ID card
// @route   POST /id-cards/generate/:id
// @access  Private/Admin
const generateIDCard = async (req, res) => {
  try {
    const idCard = await IDCard.findById(req.params.id).populate({
      path: 'employee',
      populate: {
        path: 'user'
      }
    });
    
    if (!idCard) {
      return res.status(404).json({ message: 'ID card not found' });
    }
    
    const profile = idCard.employee;
    const user = profile.user;
    
    // Generate ID card HTML
    const idCardHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Employee ID Card</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
          }
          .id-card {
            width: 370px;
            height: 600px;
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            overflow: hidden;
            margin: 0 auto;
            position: relative;
          }
          .header {
            background: #3a4db1;
            color: white;
            padding: 20px;
            text-align: center;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
          }
          .logo {
            max-width: 100px;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
          }
          .company-address {
            font-size: 12px;
            margin: 5px 0 0;
          }
          .profile-section {
            padding: 20px;
            text-align: center;
          }
          .profile-picture {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            object-fit: cover;
            border: 5px solid #3a4db1;
            margin-bottom: 15px;
          }
          .employee-name {
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0 5px;
          }
          .employee-id {
            font-size: 14px;
            color: #666;
            margin: 5px 0;
          }
          .qr-section {
            text-align: center;
            padding: 0 20px 20px;
          }
          .qr-code {
            width: 120px;
            height: 120px;
          }
          .footer {
            background: #3a4db1;
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 12px;
            position: absolute;
            bottom: 0;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="id-card">
          <div class="header">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIyNSIgeT0iMjUiIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgc3R5bGU9ImZpbGw6IHdoaXRlOyIgLz48dGV4dCB4PSI1MCIgeT0iNjAiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMzYTRkYjEiPkwmQTwvdGV4dD48L3N2Zz4=" class="logo" alt="L&A Logo">
            <h1 class="company-name">L&A Logistics Services</h1>
            <p class="company-address">123 Logistics Way, Metro Manila, Philippines</p>
          </div>
          <div class="profile-section">
            <img src="/uploads/profile/${profile.profilePicture}" alt="${user.name}" class="profile-picture">
            <h2 class="employee-name">${user.name}</h2>
            <p class="employee-id">Employee ID: ${user.employeeNumber}</p>
            <p class="employee-position">Logistics Personnel</p>
          </div>
          <div class="qr-section">
            <img src="/uploads/ids/${idCard.qrCodeImage}" alt="QR Code" class="qr-code">
          </div>
          <div class="footer">
            <p>This ID is property of L&A Logistics Services. If found, please return.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Generate PDF from HTML
    const options = {
      format: 'A4',
      orientation: 'portrait',
      border: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    };
    
    const idCardFileName = `id-card-${user._id}-${Date.now()}.pdf`;
    const idCardFilePath = path.join(__dirname, '../public/uploads/ids/', idCardFileName);
    
    htmlPdf.create(idCardHtml, options).toFile(idCardFilePath, async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error generating ID card', error: err });
      }
      
      // Update ID card with file path
      idCard.cardImage = idCardFileName;
      await idCard.save();
      
      res.json({
        message: 'ID card generated successfully',
        cardUrl: `/uploads/ids/${idCardFileName}`,
        idCardId: idCard._id
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// @desc    Get ID card generation page
// @route   GET /id-cards/generate/:employeeId
// @access  Private/Admin
const getIdCardGenerationPage = async (req, res) => {
  try {
    const profile = await EmployeeProfile.findOne({ user: req.params.employeeId }).populate('user');
    
    if (!profile) {
      return res.status(404).render('error', {
        message: 'Employee profile not found',
        error: {}
      });
    }
    
    // Check if ID card already exists
    const existingIdCard = await IDCard.findOne({ employee: profile._id });
    
    res.render('id-cards/generate', {
      profile,
      user: profile.user,
      idCard: existingIdCard,
      currentUser: req.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      message: 'Server error',
      error
    });
  }
};

module.exports = {
  generateQRCode,
  generateIDCard,
  getIdCardGenerationPage
};
