const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getVisitorDashboard,
  getDailyStats,
  getTrafficSourcesData,
  getTopPagesData,
  getGeoData,
  getRealTime,
  updatePropertyId,
} = require('../controllers/visitorStatsController');

// All routes require authentication
router.use(authMiddleware);

// Get comprehensive visitor dashboard
router.get('/:websiteId/dashboard', getVisitorDashboard);

// Get daily visitor statistics
router.get('/:websiteId/daily', getDailyStats);

// Get traffic sources breakdown
router.get('/:websiteId/sources', getTrafficSourcesData);

// Get top pages
router.get('/:websiteId/pages', getTopPagesData);

// Get geographic data
router.get('/:websiteId/geo', getGeoData);

// Get real-time active users
router.get('/:websiteId/realtime', getRealTime);

// Update GA4 Property ID for a website
router.put('/:websiteId/property', updatePropertyId);

module.exports = router;
