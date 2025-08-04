const mongoose = require('mongoose');

const LostParcelSchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    unique: true
  },
  dateTimeScanned: {
    type: Date,
    required: true,
    default: Date.now
  },
  courier: {
    type: String,
    required: true,
    enum: ['SPX', 'Flash Express']
  },
  senderName: {
    type: String,
    required: true
  },
  barcodeImage: {
    type: String
  },
  qrCodeImage: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const LostParcel = mongoose.model('LostParcel', LostParcelSchema);

module.exports = LostParcel;
