const { pool } = require('../config/database');
const {
  getDashboardData,
  getVisitorStats,
  getTrafficSources,
  getTopPages,
  getGeographicData,
  getRealTimeUsers,
} = require('../services/googleAnalyticsService');

/**
 * Get GA4 Property ID for a website
 */
const getPropertyId = async (websiteId, userId) => {
  const result = await pool.query(
    `SELECT ga4_property_id FROM websites WHERE id = $1 AND user_id = $2`,
    [websiteId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].ga4_property_id;
};

/**
 * Get comprehensive visitor statistics dashboard
 */
const getVisitorDashboard = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const userId = req.user.id;

    console.log(`📊 User ${userId} fetching visitor stats for website ${websiteId}`);

    const propertyId = await getPropertyId(websiteId, userId);

    if (!propertyId) {
      return res.status(400).json({
        error: 'GA4 Property ID not configured for this website',
        message: 'Please configure your GA4 Property ID in website settings',
      });
    }

    const data = await getDashboardData(propertyId, startDate, endDate);

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching visitor dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch visitor statistics' });
  }
};

/**
 * Get daily visitor stats
 */
const getDailyStats = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const userId = req.user.id;

    const propertyId = await getPropertyId(websiteId, userId);

    if (!propertyId) {
      return res.status(400).json({
        error: 'GA4 Property ID not configured',
      });
    }

    const data = await getVisitorStats(propertyId, startDate, endDate);

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching daily stats:', error);
    res.status(500).json({ error: 'Failed to fetch daily statistics' });
  }
};

/**
 * Get traffic sources
 */
const getTrafficSourcesData = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const userId = req.user.id;

    const propertyId = await getPropertyId(websiteId, userId);

    if (!propertyId) {
      return res.status(400).json({
        error: 'GA4 Property ID not configured',
      });
    }

    const data = await getTrafficSources(propertyId, startDate, endDate);

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching traffic sources:', error);
    res.status(500).json({ error: 'Failed to fetch traffic sources' });
  }
};

/**
 * Get top pages
 */
const getTopPagesData = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const userId = req.user.id;

    const propertyId = await getPropertyId(websiteId, userId);

    if (!propertyId) {
      return res.status(400).json({
        error: 'GA4 Property ID not configured',
      });
    }

    const data = await getTopPages(propertyId, startDate, endDate);

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching top pages:', error);
    res.status(500).json({ error: 'Failed to fetch top pages' });
  }
};

/**
 * Get geographic data
 */
const getGeoData = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const userId = req.user.id;

    const propertyId = await getPropertyId(websiteId, userId);

    if (!propertyId) {
      return res.status(400).json({
        error: 'GA4 Property ID not configured',
      });
    }

    const data = await getGeographicData(propertyId, startDate, endDate);

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching geographic data:', error);
    res.status(500).json({ error: 'Failed to fetch geographic data' });
  }
};

/**
 * Get real-time active users
 */
const getRealTime = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const userId = req.user.id;

    const propertyId = await getPropertyId(websiteId, userId);

    if (!propertyId) {
      return res.status(400).json({
        error: 'GA4 Property ID not configured',
      });
    }

    const data = await getRealTimeUsers(propertyId);

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching real-time users:', error);
    res.status(500).json({ error: 'Failed to fetch real-time users' });
  }
};

/**
 * Update GA4 Property ID for a website
 */
const updatePropertyId = async (req, res) => {
  console.log('📊 updatePropertyId called');
  console.log('   Method:', req.method);
  console.log('   Params:', req.params);
  console.log('   Body:', req.body);

  try {
    const { websiteId } = req.params;
    const { propertyId } = req.body;
    const userId = req.user.id;

    console.log(`   User ${userId} updating property ID for website ${websiteId} to ${propertyId}`);

    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }

    // Verify website belongs to user
    const websiteResult = await pool.query(
      `SELECT id FROM websites WHERE id = $1 AND user_id = $2`,
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Update the property ID
    await pool.query(
      `UPDATE websites SET ga4_property_id = $1, updated_at = NOW() WHERE id = $2`,
      [propertyId, websiteId]
    );

    console.log(`✅ Updated GA4 Property ID for website ${websiteId}: ${propertyId}`);

    res.json({ success: true, message: 'GA4 Property ID updated successfully' });
  } catch (error) {
    console.error('❌ Error updating property ID:', error);
    res.status(500).json({ error: 'Failed to update GA4 Property ID' });
  }
};

module.exports = {
  getVisitorDashboard,
  getDailyStats,
  getTrafficSourcesData,
  getTopPagesData,
  getGeoData,
  getRealTime,
  updatePropertyId,
};
