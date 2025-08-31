const mongoose = require('mongoose');

const SellerLabelSchema = new mongoose.Schema({
  sellerId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
SellerLabelSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const SellerLabel = mongoose.model('SellerLabel', SellerLabelSchema);

module.exports = SellerLabel;
