const SpxAudit = require('../models/SpxAudit');
const FlashExpressAudit = require('../models/FlashExpressAudit');
const moment = require('moment');

// @desc    Show audit form
// @route   GET /audit
// @access  Private
const getAuditForm = async (req, res) => {
  try {
    res.render('audit/index', {
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

// @desc    Create new audit entry
// @route   POST /audit
// @access  Private
const createAuditEntry = async (req, res) => {
  try {
    console.log('Audit submission received:', req.body);
    
    const { 
      courierType, 
      date, 
      taskId,
      sellerId,
      shopId,
      numberOfParcels,
      handedOverWithinSLA,
      penalties,
      amount,
      notes,
      // Flash Express fields
      totalParcels, 
      deliveredParcels, 
      failedDeliveries, 
      returnedParcels,
      codAmount,
      deliveryFee,
      baseRate,
      fuelSurcharge
    } = req.body;
    
    console.log('Extracted fields:', { courierType, date, taskId, sellerId, shopId, numberOfParcels });
    
    // Validate input
    if (!courierType || !date) {
      console.log('Basic validation failed:', { courierType, date });
      return res.status(400).render('audit/index', {
        error: 'Please fill all required fields: Courier Type and Date are required',
        user: req.user
      });
    }
    
    let audit;
    
    if (courierType === 'SPX') {
      console.log('SPX validation - checking fields:', { taskId, sellerId, shopId, numberOfParcels });
      
      // Validate SPX-specific fields
      if (!taskId || !sellerId || !shopId || !numberOfParcels) {
        console.log('SPX validation failed');
        return res.status(400).render('audit/index', {
          error: 'Please fill all required SPX fields: Task ID, Seller ID, Shop ID, and Number of Parcels',
          user: req.user
        });
      }
      
      console.log('Creating SPX audit...');
      
      // Create SPX audit entry with 2025 computation rules
      audit = await SpxAudit.create({
        date: new Date(date),
        taskId,
        sellerId,
        shopId,
        numberOfParcels: parseInt(numberOfParcels),
        handedOverWithinSLA: handedOverWithinSLA === 'true' || handedOverWithinSLA === true,
        amount: parseFloat(amount) || 0,
        penalties: parseFloat(penalties) || 0,
        notes: notes || '',
        createdBy: req.user._id
      });
      
      console.log('SPX audit created:', audit._id);
    } else if (courierType === 'Flash') {
      console.log('Flash validation - using common fields:', { taskId, sellerId, shopId, numberOfParcels });
      
      // Validate common fields for Flash Express
      if (!taskId || !sellerId || !shopId || !numberOfParcels) {
        console.log('Flash validation failed');
        return res.status(400).render('audit/index', {
          error: 'Please fill all required Flash Express fields: Task ID, Seller ID, Shop ID, and Number of Parcels',
          user: req.user
        });
      }
      
      console.log('Creating Flash Express audit using common fields...');
      
      // Create Flash Express audit entry using the correct model fields
      const flashParcels = parseInt(numberOfParcels);
      const manualAmount = parseFloat(amount) || 0;
      
      console.log('Flash calculation:', { 
        taskId,
        sellerId,
        shopId,
        flashParcels, 
        manualAmount
      });
      
      audit = await FlashExpressAudit.create({
        date: new Date(date),
        taskId,
        sellerId,
        numberOfParcels: flashParcels,
        amount: manualAmount,
        createdBy: req.user._id
      });
      
      console.log('Flash Express audit created:', audit._id);
    }
    
    res.redirect('/audit/list');
  } catch (error) {
    console.error('Detailed audit creation error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).render('audit/index', {
      error: 'Error creating audit entry: ' + error.message,
      user: req.user
    });
  }
};

// SPX Earnings calculation is now handled in the model pre-save hook
// Based on 2025 Commercial Terms:
// - Base Rate: ₱0.50 for first 100 parcels per Shop ID
// - Bonus Rate: Same as Base Rate if handed over within SLA
// - 100 parcel cap per Shop ID per day
// - Penalties applied: ₱1.00 for no movement in 48hrs, ₱5.00 for late inbound

// Flash Express Earnings calculation is handled in the model pre-save hook
// ₱3.00 per parcel, max 30 parcels per seller ID per day

// @desc    Get audit list
// @route   GET /audit/list
// @access  Private
const getAuditList = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    // Default to current month if no dates provided
    const start = startDate ? moment(startDate).startOf('day').toDate() : moment().startOf('month').toDate();
    const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('month').toDate();
    
    // Define query
    const query = {
      date: {
        $gte: start,
        $lte: end
      }
    };
    
    let audits;
    let totalEarnings = 0;
    
    if (type === 'flash' || !type) {
      // Get Flash Express audits
      const flashAudits = await FlashExpressAudit.find(query).populate('createdBy', 'name').sort({ date: -1 }).lean();
      
      if (type === 'flash') {
        audits = flashAudits.map(audit => ({ ...audit, courierType: 'flash' }));
        totalEarnings = flashAudits.reduce((sum, audit) => sum + (audit.calculatedEarnings || 0), 0);
      } else {
        // Include in combined results
        audits = [...flashAudits.map(audit => ({ ...audit, courierType: 'flash' }))];
        totalEarnings += flashAudits.reduce((sum, audit) => sum + (audit.calculatedEarnings || 0), 0);
      }
    }
    
    if (type === 'spx' || !type) {
      // Get SPX audits
      const spxAudits = await SpxAudit.find(query).populate('createdBy', 'name').sort({ date: -1 }).lean();
      
      if (type === 'spx') {
        audits = spxAudits.map(audit => ({ ...audit, courierType: 'spx' }));
        totalEarnings = spxAudits.reduce((sum, audit) => sum + audit.calculatedEarnings, 0);
      } else {
        // Combine with Flash Express results
        audits = [...(audits || []), ...spxAudits.map(audit => ({ ...audit, courierType: 'spx' }))];
        totalEarnings += spxAudits.reduce((sum, audit) => sum + (audit.calculatedEarnings || 0), 0);
      }
    }
    
    // Sort combined results by date
    if (!type) {
      audits.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    res.render('audit/list', {
      audits,
      type: type || 'all',
      startDate: moment(start).format('YYYY-MM-DD'),
      endDate: moment(end).format('YYYY-MM-DD'),
      totalEarnings,
      user: req.user,
      moment
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      message: 'Server error',
      error
    });
  }
};

// @desc    Get audit reports page
// @route   GET /audit/reports
// @access  Private
const getAuditReports = async (req, res) => {
  try {
    console.log('=== REPORTS REQUEST ===');
    console.log('Query parameters:', req.query);
    console.log('Method:', req.method);
    
    const { period, type } = req.query;
    
    let startDate, endDate;
    let title = '';
    
    // Set date range based on period
    switch (period) {
      case 'daily':
        startDate = moment().startOf('day');
        endDate = moment().endOf('day');
        title = 'Daily Report - ' + moment().format('MMMM D, YYYY');
        break;
      case 'weekly':
        startDate = moment().startOf('week');
        endDate = moment().endOf('week');
        title = 'Weekly Report - ' + startDate.format('MMM D') + ' to ' + endDate.format('MMM D, YYYY');
        break;
      case 'monthly':
        startDate = moment().startOf('month');
        endDate = moment().endOf('month');
        title = 'Monthly Report - ' + moment().format('MMMM YYYY');
        break;
      case 'quarterly':
        startDate = moment().startOf('quarter');
        endDate = moment().endOf('quarter');
        title = 'Quarterly Report - Q' + Math.ceil((moment().month() + 1) / 3) + ' ' + moment().format('YYYY');
        break;
      case 'yearly':
        startDate = moment().startOf('year');
        endDate = moment().endOf('year');
        title = 'Yearly Report - ' + moment().format('YYYY');
        break;
      default:
        startDate = moment().startOf('month');
        endDate = moment().endOf('month');
        title = 'Monthly Report - ' + moment().format('MMMM YYYY');
    }
    
    console.log('Date range:', { start: startDate.format(), end: endDate.format() });
    
    // Define query
    const query = {
      date: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
      }
    };
    
    console.log('Query:', query);
    
    let spxData = [];
    let flashData = [];
    let totalSpxEarnings = 0;
    let totalFlashEarnings = 0;
    
    if (type === 'spx' || !type) {
      // Get SPX data grouped by date
      const spxAudits = await SpxAudit.find(query).sort({ date: 1 });
      
      // Group by date for chart
      const spxByDate = {};
      spxAudits.forEach(audit => {
        const dateKey = moment(audit.date).format('YYYY-MM-DD');
        if (!spxByDate[dateKey]) {
          spxByDate[dateKey] = { count: 0, earnings: 0 };
        }
        spxByDate[dateKey].count += audit.numberOfParcels || 0;
        spxByDate[dateKey].earnings += audit.calculatedEarnings || 0;
        totalSpxEarnings += audit.calculatedEarnings || 0;
      });
      
      // Convert to array for chart
      Object.keys(spxByDate).forEach(date => {
        spxData.push({
          date,
          formattedDate: moment(date).format('MMM D'),
          count: spxByDate[date].count,
          earnings: spxByDate[date].earnings
        });
      });
    }
    
    if (type === 'flash' || !type) {
      // Get Flash Express data grouped by date
      const flashAudits = await FlashExpressAudit.find(query).sort({ date: 1 });
      
      // Group by date for chart
      const flashByDate = {};
      flashAudits.forEach(audit => {
        const dateKey = moment(audit.date).format('YYYY-MM-DD');
        if (!flashByDate[dateKey]) {
          flashByDate[dateKey] = { count: 0, earnings: 0 };
        }
        flashByDate[dateKey].count += audit.numberOfParcels || 0; // Use numberOfParcels field
        flashByDate[dateKey].earnings += audit.calculatedEarnings || 0;
        totalFlashEarnings += audit.calculatedEarnings || 0;
      });
      
      // Convert to array for chart
      Object.keys(flashByDate).forEach(date => {
        flashData.push({
          date,
          formattedDate: moment(date).format('MMM D'),
          count: flashByDate[date].count,
          earnings: flashByDate[date].earnings
        });
      });
    }
    
    console.log('Rendering reports with data:', {
      spxDataLength: spxData.length,
      flashDataLength: flashData.length,
      totalSpxEarnings,
      totalFlashEarnings
    });
    
    // Calculate report data
    const totalEntries = spxData.length + flashData.length;
    const totalParcels = [...spxData, ...flashData].reduce((sum, audit) => {
      return sum + (audit.numberOfParcels || audit.totalParcels || 0);
    }, 0);
    const deliveredParcels = [...spxData, ...flashData].reduce((sum, audit) => {
      return sum + (audit.deliveredParcels || 0);
    }, 0);
    const failedDeliveries = [...spxData, ...flashData].reduce((sum, audit) => {
      return sum + (audit.failedDeliveries || 0);
    }, 0);
    const returnedParcels = [...spxData, ...flashData].reduce((sum, audit) => {
      return sum + (audit.returnedParcels || 0);
    }, 0);
    
    // Create chart data for time series
    const chartLabels = [];
    const earningsData = [];
    
    // Group data by date for time series
    const groupedData = {};
    [...spxData, ...flashData].forEach(audit => {
      const dateKey = moment(audit.auditDate).format('MMM DD');
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = 0;
      }
      groupedData[dateKey] += audit.calculatedEarnings || 0;
    });
    
    // Convert to arrays for chart
    Object.keys(groupedData).sort().forEach(date => {
      chartLabels.push(date);
      earningsData.push(groupedData[date]);
    });
    
    const reportData = {
      totalEntries,
      totalParcels,
      deliveredParcels,
      failedDeliveries,
      returnedParcels,
      totalEarnings: totalSpxEarnings + totalFlashEarnings,
      spxEarnings: totalSpxEarnings,
      flashEarnings: totalFlashEarnings,
      chartData: {
        labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
        earnings: earningsData.length > 0 ? earningsData : [0]
      }
    };
    
    res.render('audit/reports', {
      title,
      period: period || 'monthly',
      reportType: period || 'monthly',
      courierType: type || 'all',
      type: type || 'all',
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      spxData: JSON.stringify(spxData),
      flashData: JSON.stringify(flashData),
      reportData,
      user: req.user
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).render('error', {
      message: 'Server error in reports: ' + error.message,
      error
    });
  }
};

// @desc    Delete audit entry
// @route   DELETE /audit/:type/:id
// @access  Private/Admin
const deleteAuditEntry = async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    
    let result;
    
    if (type === 'spx') {
      result = await SpxAudit.findByIdAndDelete(id);
    } else if (type === 'flash') {
      result = await FlashExpressAudit.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ message: 'Invalid audit type' });
    }
    
    if (!result) {
      return res.status(404).json({ message: 'Audit entry not found' });
    }
    
    res.json({ message: 'Audit entry deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// @desc    Get single audit entry
// @route   GET /audit/:type/:id
// @access  Private
const getAuditById = async (req, res) => {
  try {
    const { type, id } = req.params;
    
    let audit;
    
    if (type === 'spx') {
      audit = await SpxAudit.findById(id).populate('createdBy', 'name');
    } else if (type === 'flash') {
      audit = await FlashExpressAudit.findById(id).populate('createdBy', 'name');
    } else {
      return res.status(400).render('error', {
        message: 'Invalid audit type',
        error: {}
      });
    }
    
    if (!audit) {
      return res.status(404).render('error', {
        message: 'Audit entry not found',
        error: {}
      });
    }
    
    res.render('audit/view', {
      audit,
      type,
      user: req.user,
      moment
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      message: 'Server error',
      error
    });
  }
};

// @desc    Show edit audit form
// @route   GET /audit/:type/:id/edit
// @access  Private/Admin
const getEditAuditForm = async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        message: 'Not authorized to edit audit entries',
        error: {}
      });
    }
    
    let audit;
    
    if (type === 'spx') {
      audit = await SpxAudit.findById(id);
    } else if (type === 'flash') {
      audit = await FlashExpressAudit.findById(id);
    } else {
      return res.status(400).render('error', {
        message: 'Invalid audit type',
        error: {}
      });
    }
    
    if (!audit) {
      return res.status(404).render('error', {
        message: 'Audit entry not found',
        error: {}
      });
    }
    
    res.render('audit/edit', {
      audit,
      type,
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

// @desc    Update audit entry
// @route   PUT /audit/:type/:id
// @access  Private/Admin
const updateAuditEntry = async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update audit entries' });
    }
    
    let audit;
    
    if (type === 'spx') {
      audit = await SpxAudit.findByIdAndUpdate(id, req.body, { new: true });
    } else if (type === 'flash') {
      audit = await FlashExpressAudit.findByIdAndUpdate(id, req.body, { new: true });
    } else {
      return res.status(400).json({ message: 'Invalid audit type' });
    }
    
    if (!audit) {
      return res.status(404).json({ message: 'Audit entry not found' });
    }
    
    res.redirect(`/audit/${type}/${id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

module.exports = {
  getAuditForm,
  createAuditEntry,
  getAuditList,
  getAuditReports,
  getAuditById,
  getEditAuditForm,
  updateAuditEntry,
  deleteAuditEntry
};
