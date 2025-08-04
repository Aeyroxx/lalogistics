const mongoose = require('mongoose');

const FlashExpressAuditSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  taskId: {
    type: String,
    required: true
  },
  sellerId: {
    type: String,
    required: true
  },
  numberOfParcels: {
    type: Number,
    required: true,
    min: 1,
    max: 30 // Maximum 30 parcels per seller ID per day
  },
  amount: {
    type: Number,
    default: 0
  },
  calculatedEarnings: {
    type: Number,
    default: 0
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

// Calculate earnings based on Flash Express rules
FlashExpressAuditSchema.pre('save', function(next) {
  // ₱3.00 per parcel, max 30 parcels
  const parcelsCount = Math.min(this.numberOfParcels, 30);
  this.calculatedEarnings = parcelsCount * 3.0;
  next();
});

const FlashExpressAudit = mongoose.model('FlashExpressAudit', FlashExpressAuditSchema);

module.exports = FlashExpressAudit;
