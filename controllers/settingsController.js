const SellerLabel = require('../models/SellerLabel');
const SpxAudit = require('../models/SpxAudit');
const FlashExpressAudit = require('../models/FlashExpressAudit');

// @desc    Show settings page
// @route   GET /settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        message: 'Access denied. Admin privileges required.',
        error: {}
      });
    }

    // Get all seller labels
    const sellerLabels = await SellerLabel.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ shopName: 1 });

    res.render('settings', {
      user: req.user,
      sellerLabels
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).render('error', {
      message: 'Server error',
      error
    });
  }
};

// @desc    Create new seller label
// @route   POST /settings/seller-labels
// @access  Private/Admin
const createSellerLabel = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { sellerId, shopName, notes } = req.body;

    // Validate input
    if (!sellerId || !shopName) {
      return res.status(400).json({ 
        message: 'Seller ID and Shop Name are required' 
      });
    }

    // Check if seller ID already exists
    const existing = await SellerLabel.findOne({ sellerId });
    if (existing) {
      return res.status(400).json({ 
        message: 'Seller ID already exists. Use edit to update.' 
      });
    }

    // Create new seller label
    const sellerLabel = await SellerLabel.create({
      sellerId: sellerId.trim(),
      shopName: shopName.trim(),
      notes: notes ? notes.trim() : '',
      createdBy: req.user._id
    });

    // Update existing audit entries with the new shop name
    
    // Update SPX audit entries
    const spxUpdateResult = await SpxAudit.updateMany(
      { sellerId: sellerId.trim() },
      { $set: { shopName: shopName.trim() } }
    );
    
    // Update Flash Express audit entries
    const flashUpdateResult = await FlashExpressAudit.updateMany(
      { sellerId: sellerId.trim() },
      { $set: { shopName: shopName.trim() } }
    );
    
    const totalUpdated = spxUpdateResult.modifiedCount + flashUpdateResult.modifiedCount;
    
    res.json({ 
      message: 'Seller label created successfully',
      sellerLabel,
      auditEntriesUpdated: totalUpdated,
      spxEntriesUpdated: spxUpdateResult.modifiedCount,
      flashEntriesUpdated: flashUpdateResult.modifiedCount
    });

  } catch (error) {
    console.error('Create seller label error:', error);
    res.status(500).json({ 
      message: 'Server error: ' + error.message 
    });
  }
};

// @desc    Update seller label
// @route   PUT /settings/seller-labels/:id
// @access  Private/Admin
const updateSellerLabel = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;
    const { sellerId, shopName, notes } = req.body;

    // Validate input
    if (!sellerId || !shopName) {
      return res.status(400).json({ 
        message: 'Seller ID and Shop Name are required' 
      });
    }

    // Check if another record with the same seller ID exists
    const existing = await SellerLabel.findOne({ 
      sellerId: sellerId.trim(),
      _id: { $ne: id }
    });
    
    if (existing) {
      return res.status(400).json({ 
        message: 'Another record with this Seller ID already exists' 
      });
    }

    // Update seller label
    const sellerLabel = await SellerLabel.findByIdAndUpdate(id, {
      sellerId: sellerId.trim(),
      shopName: shopName.trim(),
      notes: notes ? notes.trim() : '',
      updatedAt: new Date()
    }, { new: true });

    if (!sellerLabel) {
      return res.status(404).json({ message: 'Seller label not found' });
    }

    // Update existing audit entries with the new shop name
    
    // Update SPX audit entries
    const spxUpdateResult = await SpxAudit.updateMany(
      { sellerId: sellerId.trim() },
      { $set: { shopName: shopName.trim() } }
    );
    
    // Update Flash Express audit entries
    const flashUpdateResult = await FlashExpressAudit.updateMany(
      { sellerId: sellerId.trim() },
      { $set: { shopName: shopName.trim() } }
    );
    
    const totalUpdated = spxUpdateResult.modifiedCount + flashUpdateResult.modifiedCount;

    res.json({ 
      message: 'Seller label updated successfully',
      sellerLabel,
      auditEntriesUpdated: totalUpdated,
      spxEntriesUpdated: spxUpdateResult.modifiedCount,
      flashEntriesUpdated: flashUpdateResult.modifiedCount
    });

  } catch (error) {
    console.error('Update seller label error:', error);
    res.status(500).json({ 
      message: 'Server error: ' + error.message 
    });
  }
};

// @desc    Delete seller label
// @route   DELETE /settings/seller-labels/:id
// @access  Private/Admin
const deleteSellerLabel = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;

    // Soft delete by setting isActive to false
    const sellerLabel = await SellerLabel.findByIdAndUpdate(id, {
      isActive: false,
      updatedAt: new Date()
    }, { new: true });

    if (!sellerLabel) {
      return res.status(404).json({ message: 'Seller label not found' });
    }

    res.json({ message: 'Seller label deleted successfully' });

  } catch (error) {
    console.error('Delete seller label error:', error);
    res.status(500).json({ 
      message: 'Server error: ' + error.message 
    });
  }
};

// @desc    Get seller labels API (for autocomplete)
// @route   GET /api/seller-labels
// @access  Private
const getSellerLabelsAPI = async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = { isActive: true };
    if (search) {
      query.$or = [
        { sellerId: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } }
      ];
    }

    const sellerLabels = await SellerLabel.find(query)
      .select('sellerId shopName')
      .sort({ shopName: 1 })
      .limit(20);

    res.json(sellerLabels);
  } catch (error) {
    console.error('Get seller labels API error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Apply all seller labels to existing audit entries (bulk update)
// @route   POST /settings/apply-labels
// @access  Private/Admin
const applyLabelsToExistingEntries = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Get all active seller labels
    const sellerLabels = await SellerLabel.find({ isActive: true });

    let totalSpxUpdated = 0;
    let totalFlashUpdated = 0;
    const updateResults = [];

    // Apply each label to matching audit entries
    for (const label of sellerLabels) {
      
      // Update SPX audit entries
      const spxResult = await SpxAudit.updateMany(
        { 
          sellerId: label.sellerId,
          $or: [
            { shopName: { $exists: false } },
            { shopName: '' },
            { shopName: null }
          ]
        },
        { $set: { shopName: label.shopName } }
      );
      
      // Update Flash Express audit entries
      const flashResult = await FlashExpressAudit.updateMany(
        { 
          sellerId: label.sellerId,
          $or: [
            { shopName: { $exists: false } },
            { shopName: '' },
            { shopName: null }
          ]
        },
        { $set: { shopName: label.shopName } }
      );
      
      const labelTotal = spxResult.modifiedCount + flashResult.modifiedCount;
      totalSpxUpdated += spxResult.modifiedCount;
      totalFlashUpdated += flashResult.modifiedCount;
      
      updateResults.push({
        sellerId: label.sellerId,
        shopName: label.shopName,
        spxUpdated: spxResult.modifiedCount,
        flashUpdated: flashResult.modifiedCount,
        totalUpdated: labelTotal
      });
    }

    const grandTotal = totalSpxUpdated + totalFlashUpdated;

    res.json({
      message: 'Labels applied to existing entries successfully',
      totalEntriesUpdated: grandTotal,
      totalSpxUpdated,
      totalFlashUpdated,
      labelsProcessed: sellerLabels.length,
      updateResults
    });

  } catch (error) {
    console.error('Apply labels error:', error);
    res.status(500).json({ 
      message: 'Server error: ' + error.message 
    });
  }
};

module.exports = {
  getSettings,
  createSellerLabel,
  updateSellerLabel,
  deleteSellerLabel,
  getSellerLabelsAPI,
  applyLabelsToExistingEntries
};
