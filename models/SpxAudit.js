const mongoose = require('mongoose');

const SpxAuditSchema = new mongoose.Schema({
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
  shopId: {
    type: String,
    required: true
  },
  numberOfParcels: {
    type: Number,
    required: true,
    min: 1
  },
  handedOverWithinSLA: {
    type: Boolean,
    default: false,
    required: true
  },
  amount: {
    type: Number,
    default: 0
  },
  baseRate: {
    type: Number,
    default: 0
  },
  bonusRate: {
    type: Number,
    default: 0
  },
  penalties: {
    type: Number,
    default: 0
  },
  calculatedEarnings: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
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

// Calculate earnings based on SPX 2025 Commercial Terms
SpxAuditSchema.pre('save', function(next) {
  // Apply 100 parcel cap per Shop ID per day
  const incentivizedParcels = Math.min(this.numberOfParcels, 100);
  
  // Base Rate calculation (Guaranteed incentive)
  let baseRate = 0;
  if (incentivizedParcels <= 100) {
    baseRate = incentivizedParcels * 0.5; // ₱0.50 each for first 100
  } else {
    // This case shouldn't happen due to cap, but keeping for safety
    baseRate = 100 * 0.5 + (incentivizedParcels - 100) * 1.0;
  }
  
  // Bonus Rate calculation (Additional incentive if SLA compliant)
  let bonusRate = 0;
  if (this.handedOverWithinSLA) {
    if (incentivizedParcels <= 100) {
      bonusRate = incentivizedParcels * 0.5; // Same rate as Base Rate
    } else {
      // This case shouldn't happen due to cap, but keeping for safety
      bonusRate = 100 * 0.5 + (incentivizedParcels - 100) * 1.0;
    }
  }
  
  // Set individual rates for tracking
  this.baseRate = baseRate;
  this.bonusRate = bonusRate;
  
  // Total earnings before penalties
  const totalEarnings = baseRate + bonusRate;
  
  // Apply penalties if any
  this.calculatedEarnings = totalEarnings - (this.penalties || 0);
  
  // Add notes about incentivized vs total parcels
  if (this.numberOfParcels > 100) {
    this.notes = `Total parcels: ${this.numberOfParcels}, Incentivized: 100 (capped per Shop ID)`;
  }
  
  next();
});

const SpxAudit = mongoose.model('SpxAudit', SpxAuditSchema);

module.exports = SpxAudit;
