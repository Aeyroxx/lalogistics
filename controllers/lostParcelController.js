const LostParcel = require('../models/LostParcel');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// @desc    Show lost parcel form
// @route   GET /lost-parcels/add
// @access  Private
const getLostParcelForm = async (req, res) => {
  try {
    res.render('lost-parcels/add', {
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

// @desc    Create new lost parcel entry
// @route   POST /lost-parcels
// @access  Private
const createLostParcel = async (req, res) => {
  try {
    console.log('Lost parcel submission:', req.body);
    
    const { trackingNumber, dateReported, courierType, customerName, customerPhone, customerAddress, lastKnownLocation, estimatedValue, status, description, notes } = req.body;
    
    // Validate input
    if (!trackingNumber || !dateReported || !courierType || !customerName) {
      console.log('Validation failed:', { trackingNumber, dateReported, courierType, customerName });
      return res.status(400).render('lost-parcels/add', {
        error: 'Please fill all required fields: Tracking Number, Date Reported, Courier Type, and Customer Name',
        user: req.user
      });
    }
    
    // Check if tracking number already exists
    const existingParcel = await LostParcel.findOne({ trackingNumber });
    if (existingParcel) {
      return res.status(400).render('lost-parcels/add', {
        error: 'This tracking number is already registered as lost',
        user: req.user
      });
    }
    
    // Generate QR code for tracking number
    const qrImageName = `qr-${trackingNumber}-${Date.now()}.png`;
    const qrImagePath = path.join(__dirname, '../public/uploads/', qrImageName);
    
    await QRCode.toFile(qrImagePath, trackingNumber, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200
    });
    
    // Generate barcode image using HTML5 canvas (handled in the frontend)
    // The barcode URL will be set by the frontend and sent back to us
    
    // Create lost parcel entry
    const lostParcel = await LostParcel.create({
      trackingNumber,
      dateTimeScanned: new Date(dateReported),
      courier: courierType,
      senderName: customerName,
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      lastKnownLocation: lastKnownLocation || '',
      estimatedValue: parseFloat(estimatedValue) || 0,
      status: status || 'reported',
      description: description || '',
      notes: notes || '',
      qrCodeImage: qrImageName,
      createdBy: req.user._id
    });
    
    console.log('Lost parcel created:', lostParcel._id);
    res.redirect(`/lost-parcels/view/${lostParcel._id}`);
  } catch (error) {
    console.error('Lost parcel creation error:', error);
    res.status(500).render('lost-parcels/add', {
      error: 'Error creating lost parcel entry: ' + error.message,
      user: req.user
    });
  }
};

// @desc    Get lost parcel details
// @route   GET /lost-parcels/view/:id
// @access  Private
const getLostParcelById = async (req, res) => {
  try {
    const parcel = await LostParcel.findById(req.params.id).populate('createdBy', 'name');
    
    if (!parcel) {
      return res.status(404).render('error', {
        message: 'Lost parcel not found',
        error: {}
      });
    }
    
    res.render('lost-parcels/view', {
      parcel,
      moment,
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

// @desc    Get list of all lost parcels
// @route   GET /lost-parcels
// @access  Private
const getAllLostParcels = async (req, res) => {
  try {
    const parcels = await LostParcel.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    
    res.render('lost-parcels/index', {
      parcels,
      moment,
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

// @desc    Delete lost parcel
// @route   DELETE /lost-parcels/:id
// @access  Private/Admin
const deleteLostParcel = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    
    const parcel = await LostParcel.findById(req.params.id);
    
    if (!parcel) {
      return res.status(404).json({ message: 'Lost parcel not found' });
    }
    
    // Delete QR code image if exists
    if (parcel.qrCodeImage) {
      const qrCodePath = path.join(__dirname, '../public/uploads/', parcel.qrCodeImage);
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
      }
    }
    
    // Delete barcode image if exists
    if (parcel.barcodeImage) {
      const barcodePath = path.join(__dirname, '../public/uploads/', parcel.barcodeImage);
      if (fs.existsSync(barcodePath)) {
        fs.unlinkSync(barcodePath);
      }
    }
    
    await LostParcel.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Lost parcel deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// @desc    Update barcode image for lost parcel
// @route   POST /lost-parcels/:id/barcode
// @access  Private
const updateBarcodeImage = async (req, res) => {
  try {
    const { barcodeDataUrl } = req.body;
    
    if (!barcodeDataUrl) {
      return res.status(400).json({ message: 'Barcode data is required' });
    }
    
    const parcel = await LostParcel.findById(req.params.id);
    
    if (!parcel) {
      return res.status(404).json({ message: 'Lost parcel not found' });
    }
    
    // Save barcode image
    const barcodeFileName = `barcode-${parcel.trackingNumber}-${Date.now()}.png`;
    const barcodeFilePath = path.join(__dirname, '../public/uploads/', barcodeFileName);
    
    // Convert base64 data URL to file
    const base64Data = barcodeDataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(barcodeFilePath, base64Data, 'base64');
    
    // Delete old barcode image if exists
    if (parcel.barcodeImage) {
      const oldBarcodePath = path.join(__dirname, '../public/uploads/', parcel.barcodeImage);
      if (fs.existsSync(oldBarcodePath)) {
        fs.unlinkSync(oldBarcodePath);
      }
    }
    
    // Update parcel with new barcode
    parcel.barcodeImage = barcodeFileName;
    await parcel.save();
    
    res.json({
      message: 'Barcode updated successfully',
      barcodeUrl: `/uploads/${barcodeFileName}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// @desc    Show edit lost parcel form
// @route   GET /lost-parcels/:id/edit
// @access  Private/Admin
const getEditLostParcelForm = async (req, res) => {
  try {
    const parcel = await LostParcel.findById(req.params.id).populate('createdBy', 'name');
    
    if (!parcel) {
      return res.status(404).render('error', {
        message: 'Lost parcel not found',
        error: {}
      });
    }

    res.render('lost-parcels/edit', {
      parcel,
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

// @desc    Update lost parcel
// @route   PUT /lost-parcels/:id
// @access  Private/Admin
const updateLostParcel = async (req, res) => {
  try {
    const { trackingNumber, dateReported, courierType, customerName, customerPhone, customerAddress, lastKnownLocation, estimatedValue, status, description, notes } = req.body;
    
    // Validate input
    if (!trackingNumber || !dateReported || !courierType || !customerName) {
      return res.status(400).render('lost-parcels/edit', {
        error: 'Please fill all required fields: Tracking Number, Date Reported, Courier Type, and Customer Name',
        parcel: req.body,
        user: req.user
      });
    }

    // Check if tracking number already exists (excluding current parcel)
    const existingParcel = await LostParcel.findOne({ 
      trackingNumber, 
      _id: { $ne: req.params.id } 
    });
    
    if (existingParcel) {
      return res.status(400).render('lost-parcels/edit', {
        error: 'This tracking number is already registered as lost',
        parcel: req.body,
        user: req.user
      });
    }

    // Update lost parcel entry
    const updatedParcel = await LostParcel.findByIdAndUpdate(req.params.id, {
      trackingNumber,
      dateTimeScanned: new Date(dateReported),
      courier: courierType,
      senderName: customerName,
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      lastKnownLocation: lastKnownLocation || '',
      estimatedValue: parseFloat(estimatedValue) || 0,
      status: status || 'reported',
      description: description || '',
      notes: notes || '',
      updatedAt: Date.now()
    }, { new: true });

    if (!updatedParcel) {
      return res.status(404).render('error', {
        message: 'Lost parcel not found',
        error: {}
      });
    }

    console.log('Lost parcel updated:', updatedParcel._id);
    res.redirect(`/lost-parcels/view/${updatedParcel._id}`);
  } catch (error) {
    console.error('Lost parcel update error:', error);
    res.status(500).render('lost-parcels/edit', {
      error: 'Error updating lost parcel entry: ' + error.message,
      parcel: req.body,
      user: req.user
    });
  }
};

module.exports = {
  getLostParcelForm,
  createLostParcel,
  getLostParcelById,
  getAllLostParcels,
  deleteLostParcel,
  updateBarcodeImage,
  getEditLostParcelForm,
  updateLostParcel
};
