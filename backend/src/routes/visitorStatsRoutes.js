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
router.post('/:websiteId/property', updatePropertyId);

// GET endpoint for property (for debugging/fetching current property ID)
router.get('/:websiteId/property', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const userId = req.user.id;
    const { pool } = require('../config/database');

    const result = await pool.query(
      `SELECT ga4_property_id FROM websites WHERE id = $1 AND user_id = $2`,
      [websiteId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    res.json({ propertyId: result.rows[0].ga4_property_id || null });
  } catch (error) {
    console.error('Error getting property ID:', error);
    res.status(500).json({ error: 'Failed to get property ID' });
  }
});

module.exports = router;
