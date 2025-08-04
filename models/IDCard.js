const mongoose = require('mongoose');

const IDCardSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeProfile',
    required: true
  },
  qrCodeData: {
    type: String,
    required: true
  },
  qrCodeImage: {
    type: String,
    required: true
  },
  cardImage: {
    type: String,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

const IDCard = mongoose.model('IDCard', IDCardSchema);

module.exports = IDCard;
