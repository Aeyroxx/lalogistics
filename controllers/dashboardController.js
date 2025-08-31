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
    
    // Get this week's date range
    const weekStart = moment().startOf('week').toDate();
    const weekEnd = moment().endOf('week').toDate();
    
    // Get this quarter's date range
    const quarterStart = moment().startOf('quarter').toDate();
    const quarterEnd = moment().endOf('quarter').toDate();
    
    // Get this year's date range
    const yearStart = moment().startOf('year').toDate();
    const yearEnd = moment().endOf('year').toDate();
    
    // Get this week's earnings
    const weekSpxEarnings = await SpxAudit.aggregate([
      {
        $match: {
          date: {
            $gte: weekStart,
            $lte: weekEnd
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
    
    const weekFlashEarnings = await FlashExpressAudit.aggregate([
      {
        $match: {
          date: {
            $gte: weekStart,
            $lte: weekEnd
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
    
    // Get this quarter's earnings
    const quarterSpxEarnings = await SpxAudit.aggregate([
      {
        $match: {
          date: {
            $gte: quarterStart,
            $lte: quarterEnd
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

    const quarterFlashEarnings = await FlashExpressAudit.aggregate([
      {
        $match: {
          date: {
            $gte: quarterStart,
            $lte: quarterEnd
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
    
    // Get this year's earnings
    const yearSpxEarnings = await SpxAudit.aggregate([
      {
        $match: {
          date: {
            $gte: yearStart,
            $lte: yearEnd
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

    const yearFlashEarnings = await FlashExpressAudit.aggregate([
      {
        $match: {
          date: {
            $gte: yearStart,
            $lte: yearEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' }
        }
      }
    ]);    // Get all-time earnings for fallback when current period has no data
    const allTimeSpxEarnings = await SpxAudit.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' }
        }
      }
    ]);
    
    const allTimeFlashEarnings = await FlashExpressAudit.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' }
        }
      }
    ]);
    
    // Calculate totals with fallback to all-time if current period is empty
    const todayEarnings = 
      (todaySpxEarnings.length > 0 ? todaySpxEarnings[0].total : 0) + 
      (todayFlashEarnings.length > 0 ? todayFlashEarnings[0].total : 0);
    
    const weekEarnings = 
      (weekSpxEarnings.length > 0 ? weekSpxEarnings[0].total : 0) + 
      (weekFlashEarnings.length > 0 ? weekFlashEarnings[0].total : 0);
    
    const monthEarnings = 
      (monthSpxEarnings.length > 0 ? monthSpxEarnings[0].total : 0) + 
      (monthFlashEarnings.length > 0 ? monthFlashEarnings[0].total : 0);
    
    const quarterEarnings = 
      (quarterSpxEarnings.length > 0 ? quarterSpxEarnings[0].total : 0) + 
      (quarterFlashEarnings.length > 0 ? quarterFlashEarnings[0].total : 0);
    
    const yearEarnings = 
      (yearSpxEarnings.length > 0 ? yearSpxEarnings[0].total : 0) + 
      (yearFlashEarnings.length > 0 ? yearFlashEarnings[0].total : 0);
      
    const allTimeEarnings = 
      (allTimeSpxEarnings.length > 0 ? allTimeSpxEarnings[0].total : 0) + 
      (allTimeFlashEarnings.length > 0 ? allTimeFlashEarnings[0].total : 0);
    
    console.log('Earnings Summary:');
    console.log('- Today:', todayEarnings);
    console.log('- This Week:', weekEarnings);
    console.log('- This Month:', monthEarnings);
    console.log('- This Quarter:', quarterEarnings);
    console.log('- This Year:', yearEarnings);
    console.log('- All Time:', allTimeEarnings);
    
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
      weekEarnings,
      monthEarnings,
      quarterEarnings,
      yearEarnings,
      allTimeEarnings,
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

// @desc    Get dashboard report data via API
// @route   GET /dashboard/api/reports
// @access  Private
const getDashboardReportData = async (req, res) => {
  try {
    const { period } = req.query;
    
    let start, end;
    const now = moment();
    
    switch (period) {
      case 'today':
        start = now.clone().startOf('day');
        end = now.clone().endOf('day');
        break;
      case 'week':
        start = now.clone().startOf('week');
        end = now.clone().endOf('week');
        break;
      case 'month':
        start = now.clone().startOf('month');
        end = now.clone().endOf('month');
        break;
      case 'quarter':
        start = now.clone().startOf('quarter');
        end = now.clone().endOf('quarter');
        break;
      case 'year':
        start = now.clone().startOf('year');
        end = now.clone().endOf('year');
        break;
      default:
        start = now.clone().startOf('month');
        end = now.clone().endOf('month');
    }
    
    // Get earnings for the period
    const spxEarnings = await SpxAudit.aggregate([
      {
        $match: {
          date: {
            $gte: start.toDate(),
            $lte: end.toDate()
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' },
          parcels: { $sum: '$numberOfParcels' }
        }
      }
    ]);
    
    const flashEarnings = await FlashExpressAudit.aggregate([
      {
        $match: {
          date: {
            $gte: start.toDate(),
            $lte: end.toDate()
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$calculatedEarnings' },
          parcels: { $sum: '$numberOfParcels' }
        }
      }
    ]);
    
    const spxTotal = spxEarnings.length > 0 ? spxEarnings[0].total : 0;
    const flashTotal = flashEarnings.length > 0 ? flashEarnings[0].total : 0;
    const spxParcels = spxEarnings.length > 0 ? spxEarnings[0].parcels : 0;
    const flashParcels = flashEarnings.length > 0 ? flashEarnings[0].parcels : 0;
    
    res.json({
      success: true,
      period,
      data: {
        totalEarnings: spxTotal + flashTotal,
        totalParcels: spxParcels + flashParcels
      }
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getDashboard,
  getDashboardReportData
};
