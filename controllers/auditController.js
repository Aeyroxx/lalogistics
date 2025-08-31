const SpxAudit = require('../models/SpxAudit');
const FlashExpressAudit = require('../models/FlashExpressAudit');
const SellerLabel = require('../models/SellerLabel');
const moment = require('moment');
const fs = require('fs').promises;
const pdf = require('html-pdf');

// Helper function to generate Task ID
const generateTaskId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6); // Last 6 digits of timestamp
  
  // Generate Task ID pattern: LA-YYYYMMDD-XXXXXX
  return `LA-${year}${month}${day}-${timestamp}`;
};

// Helper function to apply seller label to audit entry
const applySellerLabelToAudit = async (audit, sellerId) => {
  try {
    // Check if audit already has a shop name
    if (audit.shopName && audit.shopName.trim() !== '') {
      return audit;
    }
    
    // Find matching seller label
    const sellerLabel = await SellerLabel.findOne({ 
      sellerId: sellerId,
      isActive: true 
    });
    
    if (sellerLabel) {
      audit.shopName = sellerLabel.shopName;
      await audit.save();
    }
    
    return audit;
  } catch (error) {
    console.error('Error applying seller label:', error);
    return audit;
  }
};

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
    const { 
      courierType, 
      date, 
      taskId,
      sellerId,
      shopId,
      shopName,
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
    
    // Auto-generate Task ID if not provided
    const finalTaskId = taskId || generateTaskId();
    
    // Validate input
    if (!courierType || !date) {
      return res.status(400).render('audit/index', {
        error: 'Please fill all required fields: Courier Type and Date are required',
        user: req.user
      });
    }
    
    let audit;
    
    if (courierType === 'SPX') {
      // Validate SPX-specific fields
      if (!taskId || !sellerId || !shopId || !numberOfParcels) {
        return res.status(400).render('audit/index', {
          error: 'Please fill all required SPX fields: Task ID, Seller ID, Shop ID, and Number of Parcels',
          user: req.user
        });
      }
      
      // Create SPX audit entry with 2025 computation rules
      audit = await SpxAudit.create({
        date: new Date(date),
        taskId,
        sellerId,
        shopId,
        shopName: shopName || '',
        numberOfParcels: parseInt(numberOfParcels),
        handedOverWithinSLA: handedOverWithinSLA === 'true' || handedOverWithinSLA === true,
        amount: parseFloat(amount) || 0,
        penalties: parseFloat(penalties) || 0,
        notes: notes || '',
        createdBy: req.user._id
      });
      
      console.log('SPX audit created:', audit._id);
      
      // Apply seller label if available
      audit = await applySellerLabelToAudit(audit, sellerId);
      
    } else if (courierType === 'Flash') {
      // Validate common fields for Flash Express
      if (!taskId || !sellerId || !shopId || !numberOfParcels) {
        return res.status(400).render('audit/index', {
          error: 'Please fill all required Flash Express fields: Task ID, Seller ID, Shop ID, and Number of Parcels',
          user: req.user
        });
      }
      
      // Create Flash Express audit entry using the correct model fields
      const flashParcels = parseInt(numberOfParcels);
      const manualAmount = parseFloat(amount) || 0;
      
      audit = await FlashExpressAudit.create({
        date: new Date(date),
        taskId,
        sellerId,
        shopName: shopName || '',
        numberOfParcels: flashParcels,
        amount: manualAmount,
        createdBy: req.user._id
      });
      
      console.log('Flash Express audit created:', audit._id);
      
      // Apply seller label if available
      audit = await applySellerLabelToAudit(audit, sellerId);
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
    const { type, startDate, endDate, search } = req.query;
    
    // If no date range specified, show ALL audit entries (no date filter)
    let query = {};
    if (startDate || endDate) {
      const start = startDate ? moment(startDate).startOf('day').toDate() : moment().startOf('year').toDate();
      const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('year').toDate();
      
      query = {
        date: {
          $gte: start,
          $lte: end
        }
      };
    }
    
    // Add search functionality with multi-seller ID support
    let searchQuery = {};
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Check if search contains commas (multiple seller IDs)
      if (searchTerm.includes(',')) {
        // Handle multiple seller IDs - split by comma and trim each
        const sellerIds = searchTerm.split(',').map(id => id.trim()).filter(id => id.length > 0);
        
        searchQuery = {
          $or: [
            { sellerId: { $in: sellerIds } }, // Exact match for seller IDs
            { shopName: { $regex: searchTerm, $options: 'i' } }, // Also allow shop name search
            { taskId: { $regex: searchTerm, $options: 'i' } },
            { notes: { $regex: searchTerm, $options: 'i' } }
          ]
        };
      } else {
        // Single search term - use original regex search
        searchQuery = {
          $or: [
            { sellerId: { $regex: searchTerm, $options: 'i' } },
            { shopId: { $regex: searchTerm, $options: 'i' } },
            { shopName: { $regex: searchTerm, $options: 'i' } },
            { taskId: { $regex: searchTerm, $options: 'i' } },
            { notes: { $regex: searchTerm, $options: 'i' } }
          ]
        };
      }
    }
    
    // Combine date and search queries properly
    let combinedQuery = {};
    
    // If we have both date and search conditions, combine them with $and
    if (Object.keys(query).length > 0 && Object.keys(searchQuery).length > 0) {
      combinedQuery = {
        $and: [query, searchQuery]
      };
    } else if (Object.keys(searchQuery).length > 0) {
      // Only search query
      combinedQuery = searchQuery;
    } else if (Object.keys(query).length > 0) {
      // Only date query
      combinedQuery = query;
    } else {
      // No filters - get all
      combinedQuery = {};
    }
    
    let audits = [];
    let totalEarnings = 0;
    
    if (type === 'flash' || !type) {
      // Get Flash Express audits
      const flashAudits = await FlashExpressAudit.find(combinedQuery).populate('createdBy', 'name').sort({ date: -1 }).lean();
      
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
      const spxAudits = await SpxAudit.find(combinedQuery).populate('createdBy', 'name').sort({ date: -1 }).lean();
      
      if (type === 'spx') {
        audits = spxAudits.map(audit => ({ ...audit, courierType: 'spx' }));
        totalEarnings = spxAudits.reduce((sum, audit) => sum + audit.calculatedEarnings, 0);
      } else {
        // Combine with Flash Express results
        audits = [...audits, ...spxAudits.map(audit => ({ ...audit, courierType: 'spx' }))];
        totalEarnings += spxAudits.reduce((sum, audit) => sum + (audit.calculatedEarnings || 0), 0);
      }
    }
    
    // Sort combined results by date
    if (!type) {
      audits.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Set display dates for the template
    const displayStartDate = startDate ? moment(startDate).format('YYYY-MM-DD') : '';
    const displayEndDate = endDate ? moment(endDate).format('YYYY-MM-DD') : '';

    res.render('audit/list', {
      audits,
      type: type || 'all',
      startDate: displayStartDate,
      endDate: displayEndDate,
      search: search || '',
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
    
    const { startDate, endDate, type } = req.query;
    
    let start, end;
    let title = '';
    
    // Handle date range
    if (startDate && endDate) {
      start = moment(startDate).startOf('day');
      end = moment(endDate).endOf('day');
      
      // Create title based on date range
      if (start.isSame(end, 'day')) {
        title = `Daily Report - ${start.format('MMMM D, YYYY')}`;
      } else if (start.isSame(end, 'week')) {
        title = `Weekly Report - ${start.format('MMM D')} to ${end.format('MMM D, YYYY')}`;
      } else if (start.isSame(end, 'month')) {
        title = `Monthly Report - ${start.format('MMMM YYYY')}`;
      } else {
        title = `Report - ${start.format('MMM D, YYYY')} to ${end.format('MMM D, YYYY')}`;
      }
    } else {
      // Default to current month if no dates provided
      start = moment().startOf('month');
      end = moment().endOf('month');
      title = `Monthly Report - ${moment().format('MMMM YYYY')}`;
    }
    
    console.log('Date range:', { start: start.format(), end: end.format() });
    
    // First, check if we have ANY data at all
    const totalSpxCount = await SpxAudit.countDocuments();
    const totalFlashCount = await FlashExpressAudit.countDocuments();
    console.log('Total audit entries in DB:', { spx: totalSpxCount, flash: totalFlashCount });
    
    // Define query
    const query = {
      date: {
        $gte: start.toDate(),
        $lte: end.toDate()
      }
    };
    
    console.log('Query:', query);
    
    let totalSpxEarnings = 0;
    let totalFlashEarnings = 0;
    let spxEntries = 0;
    let flashEntries = 0;
    let spxParcels = 0;
    let flashParcels = 0;
    let allSpxAudits = [];
    let allFlashAudits = [];

    if (type === 'spx' || !type) {
      // Get SPX data
      allSpxAudits = await SpxAudit.find(query).sort({ date: 1 }).lean();
      totalSpxEarnings = allSpxAudits.reduce((sum, audit) => sum + (audit.calculatedEarnings || 0), 0);
      spxEntries = allSpxAudits.length;
      spxParcels = allSpxAudits.reduce((sum, audit) => sum + (audit.numberOfParcels || 0), 0);
    }

    if (type === 'flash' || !type) {
      // Get Flash Express data
      allFlashAudits = await FlashExpressAudit.find(query).sort({ date: 1 }).lean();
      totalFlashEarnings = allFlashAudits.reduce((sum, audit) => sum + (audit.calculatedEarnings || 0), 0);
      flashEntries = allFlashAudits.length;
      flashParcels = allFlashAudits.reduce((sum, audit) => sum + (audit.numberOfParcels || 0), 0);
    }
    
    console.log('Rendering reports with data:', {
      totalSpxEarnings,
      totalFlashEarnings,
      spxEntries,
      flashEntries
    });
    
    // Calculate report data based on actual audit entries
    const totalEntries = spxEntries + flashEntries;
    const totalParcels = spxParcels + flashParcels;
    const deliveredParcels = totalParcels; // Assume all are delivered for now
    
    const reportData = {
      totalEntries,
      totalParcels,
      deliveredParcels,
      failedDeliveries: 0,
      returnedParcels: 0,
      totalEarnings: totalSpxEarnings + totalFlashEarnings,
      spxEarnings: totalSpxEarnings,
      flashEarnings: totalFlashEarnings,
      spxEntries,
      flashEntries,
      spxParcels,
      flashParcels
    };
    
    console.log('Final report data:', {
      totalEntries: reportData.totalEntries,
      totalParcels: reportData.totalParcels,
      totalEarnings: reportData.totalEarnings,
      spxEarnings: reportData.spxEarnings,
      flashEarnings: reportData.flashEarnings
    });

    // Handle PDF export
    if (req.query.export === 'pdf') {
      try {
        return await exportReportToPDF(req, res, {
          title,
          startDate: start.format('YYYY-MM-DD'),
          endDate: end.format('YYYY-MM-DD'),
          type: type || 'all',
          reportData
        });
      } catch (pdfError) {
        console.error('PDF Export Error:', pdfError);
        return res.status(500).render('error', {
          message: 'Error generating PDF: ' + pdfError.message,
          error: pdfError
        });
      }
    }

    res.render('audit/reports', {
      title,
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      type: type || 'all',
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

// @desc    Show SPX import form
// @route   GET /audit/import/spx
// @access  Private/Admin
const getSpxImportForm = async (req, res) => {
  try {
    res.render('audit/import-spx', {
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

// @desc    Import SPX automation data from JSON
// @route   POST /audit/import/spx
// @access  Private/Admin
const importSpxData = async (req, res) => {
  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];
  const duplicates = [];
  
  try {
    if (!req.file) {
      return res.status(400).render('audit/import-spx', {
        user: req.user,
        error: 'Please select a JSON file to upload.'
      });
    }
    
    console.log('Reading SPX import file:', req.file.path);
    
    // Read and parse JSON file
    const fileContent = await fs.readFile(req.file.path, 'utf8');
    let jsonData;
    
    try {
      jsonData = JSON.parse(fileContent);
    } catch (parseError) {
      await fs.unlink(req.file.path); // Clean up temp file
      return res.status(400).render('audit/import-spx', {
        user: req.user,
        error: 'Invalid JSON file format. Please check your file and try again.'
      });
    }
    
    // Validate JSON structure (expecting array of tasks from SPX automation)
    if (!Array.isArray(jsonData)) {
      await fs.unlink(req.file.path);
      return res.status(400).render('audit/import-spx', {
        user: req.user,
        error: 'Invalid JSON structure. Expected an array of tasks from SPX automation.'
      });
    }
    
    console.log(`Processing ${jsonData.length} tasks from SPX automation`);
    
    // Process each task from the automation
    for (const task of jsonData) {
      try {
        if (!task.receive_task_id || !task.sender_data || !task.status) {
          errors.push(`Task missing required fields: ${task.receive_task_id || 'unknown'}`);
          errorCount++;
          continue;
        }
        
        // Only process tasks with "Done" status
        if (task.status !== 'Done') {
          skippedCount++;
          continue;
        }
        
        // Process each sender in the task
        for (const [senderId, trackingCount] of Object.entries(task.sender_data)) {
          try {
            // Skip if no tracking numbers
            if (!trackingCount || trackingCount === 0) {
              continue;
            }
            
            // Parse date from task completion time or use current date
            let taskDate = new Date();
            if (task.complete_time && task.complete_time !== 'N/A') {
              const parsedDate = moment(task.complete_time);
              if (parsedDate.isValid()) {
                taskDate = parsedDate.toDate();
              }
            }
            
            // Check for existing audit entry (avoid duplicates)
            const existing = await SpxAudit.findOne({
              taskId: task.receive_task_id,
              sellerId: senderId,
              date: {
                $gte: moment(taskDate).startOf('day').toDate(),
                $lte: moment(taskDate).endOf('day').toDate()
              }
            });
            
            if (existing) {
              duplicates.push(`${task.receive_task_id} - Sender: ${senderId}`);
              skippedCount++;
              continue;
            }
            
            // Create SPX audit entry
            const auditData = {
              date: taskDate,
              taskId: task.receive_task_id,
              sellerId: senderId,
              shopId: senderId, // Use sender ID as shop ID (can be updated manually if needed)
              numberOfParcels: parseInt(trackingCount),
              handedOverWithinSLA: true, // Assume SLA compliance for imported data
              amount: 0, // Will be calculated by pre-save hook
              penalties: 0,
              notes: `Imported from SPX automation on ${new Date().toISOString()}`,
              createdBy: req.user._id
            };
            
            const createdAudit = await SpxAudit.create(auditData);
            
            // Apply seller label if available
            await applySellerLabelToAudit(createdAudit, senderId);
            
            importedCount++;
            
            console.log(`Imported: Task ${task.receive_task_id}, Sender ${senderId}, Parcels: ${trackingCount}`);
            
          } catch (senderError) {
            console.error(`Error processing sender ${senderId}:`, senderError);
            errors.push(`Task ${task.receive_task_id}, Sender ${senderId}: ${senderError.message}`);
            errorCount++;
          }
        }
        
      } catch (taskError) {
        console.error(`Error processing task ${task.receive_task_id}:`, taskError);
        errors.push(`Task ${task.receive_task_id}: ${taskError.message}`);
        errorCount++;
      }
    }
    
    // Clean up temp file
    await fs.unlink(req.file.path);
    
    // Prepare results summary
    const results = {
      totalTasks: jsonData.length,
      importedCount,
      skippedCount,
      errorCount,
      errors: errors.slice(0, 10), // Show first 10 errors
      duplicates: duplicates.slice(0, 10), // Show first 10 duplicates
      hasMoreErrors: errors.length > 10,
      hasMoreDuplicates: duplicates.length > 10
    };
    
    console.log('Import completed:', results);
    
    // Render results page
    res.render('audit/import-results', {
      user: req.user,
      results,
      importType: 'SPX'
    });
    
  } catch (error) {
    console.error('SPX import error:', error);
    
    // Clean up temp file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up temp file:', unlinkError);
      }
    }
    
    res.status(500).render('audit/import-spx', {
      user: req.user,
      error: `Import failed: ${error.message}`,
      results: importedCount > 0 ? {
        importedCount,
        skippedCount,
        errorCount
      } : null
    });
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

// @desc    Export audit report as PDF
// @route   GET /audit/export/pdf
// @access  Private (Admin)
const exportAuditPDF = async (req, res) => {
  try {
    const { startDate, endDate, search, type } = req.query;
    
    // Build query similar to getAuditList
    let query = {};
    if (startDate || endDate) {
      const start = startDate ? moment(startDate).startOf('day').toDate() : moment().startOf('year').toDate();
      const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('year').toDate();
      
      query = {
        date: {
          $gte: start,
          $lte: end
        }
      };
    }
    
    // Add search functionality with multi-seller ID support (same as getAuditList)
    let searchQuery = {};
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Check if search contains commas (multiple seller IDs)
      if (searchTerm.includes(',')) {
        // Handle multiple seller IDs - split by comma and trim each
        const sellerIds = searchTerm.split(',').map(id => id.trim()).filter(id => id.length > 0);
        
        console.log('Multi-seller ID search detected for PDF export:', sellerIds);
        
        searchQuery = {
          $or: [
            { sellerId: { $in: sellerIds } }, // Exact match for seller IDs
            { shopName: { $regex: searchTerm, $options: 'i' } }, // Also allow shop name search
            { taskId: { $regex: searchTerm, $options: 'i' } },
            { notes: { $regex: searchTerm, $options: 'i' } }
          ]
        };
      } else {
        // Single search term - use original regex search
        searchQuery = {
          $or: [
            { sellerId: { $regex: searchTerm, $options: 'i' } },
            { shopId: { $regex: searchTerm, $options: 'i' } },
            { shopName: { $regex: searchTerm, $options: 'i' } },
            { taskId: { $regex: searchTerm, $options: 'i' } },
            { notes: { $regex: searchTerm, $options: 'i' } }
          ]
        };
      }
    }
    
    // Combine date and search queries properly (same as getAuditList)
    let combinedQuery = {};
    
    // If we have both date and search conditions, combine them with $and
    if (Object.keys(query).length > 0 && Object.keys(searchQuery).length > 0) {
      combinedQuery = {
        $and: [query, searchQuery]
      };
      console.log('PDF Export - Combined query (date + search):', JSON.stringify(combinedQuery, null, 2));
    } else if (Object.keys(searchQuery).length > 0) {
      // Only search query
      combinedQuery = searchQuery;
      console.log('PDF Export - Search only query:', JSON.stringify(combinedQuery, null, 2));
    } else if (Object.keys(query).length > 0) {
      // Only date query
      combinedQuery = query;
      console.log('PDF Export - Date only query:', JSON.stringify(combinedQuery, null, 2));
    } else {
      // No filters - get all
      combinedQuery = {};
      console.log('PDF Export - No filters - returning all records');
    }
    
    let audits = [];
    let totalEarnings = 0;
    
    if (type === 'flash' || !type) {
      const flashAudits = await FlashExpressAudit.find(combinedQuery).populate('createdBy', 'name').sort({ date: -1 }).lean();
      audits = [...audits, ...flashAudits.map(audit => ({ ...audit, courierType: 'flash' }))];
      totalEarnings += flashAudits.reduce((sum, audit) => sum + (audit.calculatedEarnings || 0), 0);
    }
    
    if (type === 'spx' || !type) {
      const spxAudits = await SpxAudit.find(combinedQuery).populate('createdBy', 'name').sort({ date: -1 }).lean();
      audits = [...audits, ...spxAudits.map(audit => ({ ...audit, courierType: 'spx' }))];
      totalEarnings += spxAudits.reduce((sum, audit) => sum + (audit.calculatedEarnings || 0), 0);
    }
    
    // Sort combined results by date
    audits.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Build title
    let title = 'Audit Report';
    if (startDate && endDate) {
      if (startDate === endDate) {
        title = `Daily Audit Report - ${moment(startDate).format('MMMM D, YYYY')}`;
      } else {
        title = `Audit Report - ${moment(startDate).format('MMM D, YYYY')} to ${moment(endDate).format('MMM D, YYYY')}`;
      }
    } else if (startDate) {
      title = `Audit Report from ${moment(startDate).format('MMM D, YYYY')}`;
    } else if (endDate) {
      title = `Audit Report until ${moment(endDate).format('MMM D, YYYY')}`;
    }
    
    if (search) {
      title += ` (Search: "${search}")`;
    }
    
    // Create HTML for PDF
    const html = 
`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            font-size: 12px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4361ee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #4361ee;
            margin-bottom: 5px;
        }
        .company-address {
            color: #666;
            margin-bottom: 15px;
        }
        .report-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .report-date {
            color: #666;
            font-size: 14px;
        }
        .summary-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
        }
        .summary-item {
            text-align: center;
        }
        .summary-label {
            font-weight: bold;
            color: #666;
            font-size: 11px;
            text-transform: uppercase;
        }
        .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #4361ee;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
        }
        th, td {
            border: 1px solid #dee2e6;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #4361ee;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .courier-spx {
            background-color: #e3f2fd;
        }
        .courier-flash {
            background-color: #f3e5f5;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 10px;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
        }
        .total-row {
            font-weight: bold;
            background-color: #4361ee !important;
            color: white !important;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">L&A Logistics Services</div>
        <div class="company-address">1150 Gulod Street., Bagong Barrio, Pandi, Bulacan 3014</div>
        <div class="report-title">${title}</div>
        <div class="report-date">Generated on ${moment().format('MMMM D, YYYY [at] h:mm A')}</div>
    </div>
    
    <div class="summary-box">
        <div class="summary-item">
            <div class="summary-label">Total Entries</div>
            <div class="summary-value">${audits.length}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Total Earnings</div>
            <div class="summary-value">₱${totalEarnings.toFixed(2)}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">SPX Entries</div>
            <div class="summary-value">${audits.filter(a => a.courierType === 'spx').length}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Flash Entries</div>
            <div class="summary-value">${audits.filter(a => a.courierType === 'flash').length}</div>
        </div>
    </div>
    
    ${audits.length > 0 ? `
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Courier</th>
                <th>Task ID</th>
                <th>Seller ID</th>
                <th>Shop Name</th>
                <th class="text-center">Parcels</th>
                <th class="text-right">Earnings</th>
            </tr>
        </thead>
        <tbody>
            ${audits.map(audit => `
            <tr class="courier-${audit.courierType}">
                <td>${moment(audit.date).format('MMM D, YYYY')}</td>
                <td>${audit.courierType === 'spx' ? 'SPX' : 'Flash Express'}</td>
                <td>${audit.taskId || 'N/A'}</td>
                <td>${audit.sellerId || 'N/A'}</td>
                <td>${audit.shopName || audit.shopId || 'N/A'}</td>
                <td class="text-center">${audit.numberOfParcels || 0}</td>
                <td class="text-right">₱${(audit.calculatedEarnings || 0).toFixed(2)}</td>
            </tr>
            `).join('')}
            <tr class="total-row">
                <td colspan="6" class="text-right"><strong>TOTAL EARNINGS:</strong></td>
                <td class="text-right"><strong>₱${totalEarnings.toFixed(2)}</strong></td>
            </tr>
        </tbody>
    </table>
    ` : '<p style="text-align: center; color: #666; font-style: italic;">No audit entries found for the specified criteria.</p>'}
    
    <div class="footer">
        <p>This report was generated automatically by L&A Logistics Services Portal</p>
        <p>For inquiries, please contact us at 1150 Gulod Street., Bagong Barrio, Pandi, Bulacan 3014</p>
    </div>
</body>
</html>`;

    // Generate PDF
    const options = {
      format: 'A4',
      orientation: 'portrait',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      header: {
        height: '0mm'
      },
      footer: {
        height: '0mm'
      }
    };

    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) {
        console.error('PDF generation error:', err);
        return res.status(500).json({ error: 'Error generating PDF' });
      }

      const filename = `audit-report-${moment().format('YYYY-MM-DD-HHmm')}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    });

  } catch (error) {
    console.error('Export PDF Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Export report data to PDF
// @route   Internal function for report PDF export
// @access  Private
const exportReportToPDF = async (req, res, reportDetails) => {
  try {
    const { title, startDate, endDate, type, reportData } = reportDetails;
    
    // Create HTML for PDF
    const html = 
`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            font-size: 12px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4361ee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #4361ee;
            margin-bottom: 5px;
        }
        .company-address {
            color: #666;
            margin-bottom: 15px;
        }
        .report-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .report-date {
            color: #666;
            font-size: 14px;
        }
        .summary-section {
            margin: 30px 0;
        }
        .summary-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #4361ee;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .summary-label {
            font-weight: bold;
            color: #666;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: #4361ee;
        }
        .breakdown-section {
            margin: 30px 0;
        }
        .breakdown-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        .breakdown-card {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .breakdown-card.spx {
            border-left: 4px solid #4361ee;
        }
        .breakdown-card.flash {
            border-left: 4px solid #17a2b8;
        }
        .breakdown-card.success {
            border-left: 4px solid #28a745;
        }
        .breakdown-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .breakdown-title.spx { color: #4361ee; }
        .breakdown-title.flash { color: #17a2b8; }
        .breakdown-title.success { color: #28a745; }
        .breakdown-amount {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .breakdown-details {
            color: #666;
            font-size: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        .stats-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">L&A Logistics Services</div>
        <div class="company-address">1150 Gulod Street., Bagong Barrio, Pandi, Bulacan 3014</div>
        <div class="report-title">${title}</div>
        <div class="report-date">Generated on ${moment().format('MMMM D, YYYY [at] h:mm A')}</div>
        <div class="report-date">Report Period: ${moment(startDate).format('MMM D, YYYY')} to ${moment(endDate).format('MMM D, YYYY')}</div>
    </div>
    
    <div class="summary-section">
        <div class="summary-title">Summary Statistics</div>
        <div class="stats-row">
            <div class="summary-card">
                <div class="summary-label">Total Entries</div>
                <div class="summary-value">${reportData.totalEntries || 0}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Parcels</div>
                <div class="summary-value">${reportData.totalParcels || 0}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Delivered Parcels</div>
                <div class="summary-value">${reportData.deliveredParcels || 0}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Earnings</div>
                <div class="summary-value">₱${reportData.totalEarnings ? reportData.totalEarnings.toFixed(2) : '0.00'}</div>
            </div>
        </div>
    </div>
    
    <div class="breakdown-section">
        <div class="summary-title">Breakdown by Courier</div>
        <div class="breakdown-grid">
            <div class="breakdown-card spx">
                <div class="breakdown-title spx">SPX Express</div>
                <div class="breakdown-amount">₱${reportData.spxEarnings ? reportData.spxEarnings.toFixed(2) : '0.00'}</div>
                <div class="breakdown-details">
                    ${reportData.spxEntries || 0} entries • ${reportData.spxParcels || 0} parcels
                </div>
            </div>
            <div class="breakdown-card flash">
                <div class="breakdown-title flash">Flash Express</div>
                <div class="breakdown-amount">₱${reportData.flashEarnings ? reportData.flashEarnings.toFixed(2) : '0.00'}</div>
                <div class="breakdown-details">
                    ${reportData.flashEntries || 0} entries • ${reportData.flashParcels || 0} parcels
                </div>
            </div>
            <div class="breakdown-card success">
                <div class="breakdown-title success">Success Rate</div>
                <div class="breakdown-amount">${reportData.totalParcels > 0 ? Math.round((reportData.deliveredParcels / reportData.totalParcels) * 100) : 0}%</div>
                <div class="breakdown-details">
                    ${reportData.deliveredParcels || 0} of ${reportData.totalParcels || 0} delivered
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>This report was generated automatically by L&A Logistics Services Portal</p>
        <p>For inquiries, please contact us at 1150 Gulod Street., Bagong Barrio, Pandi, Bulacan 3014</p>
    </div>
</body>
</html>`;

    // Generate PDF
    const options = {
      format: 'A4',
      orientation: 'portrait',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      header: {
        height: '0mm'
      },
      footer: {
        height: '0mm'
      }
    };

    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) {
        console.error('PDF generation error:', err);
        return res.status(500).json({ error: 'Error generating PDF' });
      }

      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '-')}-${moment().format('YYYY-MM-DD-HHmm')}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    });

  } catch (error) {
    console.error('Export Report PDF Error:', error);
    res.status(500).json({ error: error.message });
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
  deleteAuditEntry,
  getSpxImportForm,
  importSpxData,
  exportAuditPDF,
  exportReportToPDF
};
