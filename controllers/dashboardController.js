const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const SpxAudit = require('../models/SpxAudit');
const FlashExpressAudit = require('../models/FlashExpressAudit');
const LostParcel = require('../models/LostParcel');
const moment = require('moment');

// @desc    Get dashboard page
// @route   GET /dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    // Get counts
    const employeeCount = await User.countDocuments({ role: 'employee' });
    const lostParcelCount = await LostParcel.countDocuments();
    
    // Get today's date range
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    
    // Get this month's date range
    const monthStart = moment().startOf('month').toDate();
    const monthEnd = moment().endOf('month').toDate();
    
    // Get today's earnings
    const todaySpxEarnings = await SpxAudit.aggregate([
      {
        $match: {
          date: {
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' }
        }
      }
    ]);
    
    const todayFlashEarnings = await FlashExpressAudit.aggregate([
      {
        $match: {
          date: {
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' }
        }
      }
    ]);
    
    // Get this month's earnings
    const monthSpxEarnings = await SpxAudit.aggregate([
      {
        $match: {
          date: {
            $gte: monthStart,
            $lte: monthEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' }
        }
      }
    ]);
    
    const monthFlashEarnings = await FlashExpressAudit.aggregate([
      {
        $match: {
          date: {
            $gte: monthStart,
            $lte: monthEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' }
        }
      }
    ]);
    
    // Calculate totals
    const todayEarnings = 
      (todaySpxEarnings.length > 0 ? todaySpxEarnings[0].total : 0) + 
      (todayFlashEarnings.length > 0 ? todayFlashEarnings[0].total : 0);
    
    const monthEarnings = 
      (monthSpxEarnings.length > 0 ? monthSpxEarnings[0].total : 0) + 
      (monthFlashEarnings.length > 0 ? monthFlashEarnings[0].total : 0);
    
    // Get recent lost parcels
    const recentLostParcels = await LostParcel.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('Recent lost parcels:', recentLostParcels.length, 'items');
    console.log('First lost parcel sample:', recentLostParcels[0] ? {
      trackingNumber: recentLostParcels[0].trackingNumber,
      courier: recentLostParcels[0].courier,
      senderName: recentLostParcels[0].senderName
    } : 'No lost parcels');
    
    // Get recent audits (combined and sorted)
    const recentSpxAudits = await SpxAudit.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(); // Add lean() for better performance and to modify objects
    
    const recentFlashAudits = await FlashExpressAudit.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(); // Add lean() for better performance and to modify objects
    
    console.log('Recent SPX audits:', recentSpxAudits.length, 'items');
    console.log('Recent Flash audits:', recentFlashAudits.length, 'items');
    
    // Add type field to distinguish between SPX and Flash
    const spxAuditsWithType = recentSpxAudits.map(audit => ({
      ...audit,
      courierType: 'SPX'
    }));
    
    const flashAuditsWithType = recentFlashAudits.map(audit => ({
      ...audit,
      courierType: 'Flash'
    }));
    
    // Combine and sort recent audits
    const recentAudits = [...spxAuditsWithType, ...flashAuditsWithType]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    console.log('Combined recent audits:', recentAudits.length, 'items');
    console.log('First audit sample:', recentAudits[0] ? {
      sellerId: recentAudits[0].sellerId,
      courierType: recentAudits[0].courierType,
      calculatedEarnings: recentAudits[0].calculatedEarnings
    } : 'No audits');
    
    res.render('dashboard', {
      user: req.user,
      employeeCount,
      lostParcelCount,
      todayEarnings,
      monthEarnings,
      recentLostParcels,
      recentAudits,
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

module.exports = {
  getDashboard
};
