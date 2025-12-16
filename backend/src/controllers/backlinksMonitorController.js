const { pool } = require('../config/database');
const {
  checkBacklinksForWebsite,
  getLatestBacklinks,
  getBacklinkMetrics,
  getBacklinkHistory,
} = require('../services/backlinksMonitorService');

/**
 * Check backlinks for a website
 * POST /api/backlinks/:websiteId/check
 */
const checkBacklinks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    console.log(`🔗 User ${userId} checking backlinks for website ${websiteId}`);

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id, domain FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];
    // Normalize domain (strip protocol and www)
    const domain = website.domain.replace(/^(https?:\/\/)?(www\.)?/, '');

    console.log(`🌐 Checking backlinks for domain: ${domain}`);

    // Check backlinks
    const results = await checkBacklinksForWebsite(websiteId, domain);

    // Get updated metrics
    const metrics = await getBacklinkMetrics(websiteId);

    res.json({
      message: 'Backlink check completed',
      domain,
      ...results,
      metrics,
    });
  } catch (error) {
    console.error('❌ Check backlinks error:', error);
    res.status(500).json({
      error: 'Failed to check backlinks',
      details: error.message,
    });
  }
};

/**
 * Get latest backlinks for a website
 * GET /api/backlinks/:websiteId/latest
 * Query params: limit, offset, status, linkType
 */
const getLatestBacklinksForWebsite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { limit = 50, offset = 0, status = 'active', linkType = 'all' } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get backlinks with filters
    const result = await getLatestBacklinks(
      websiteId,
      parseInt(limit),
      parseInt(offset),
      { status, linkType }
    );

    // Get metrics
    const metrics = await getBacklinkMetrics(websiteId);

    res.json({
      ...result,
      metrics,
    });
  } catch (error) {
    console.error('❌ Get latest backlinks error:', error);
    res.status(500).json({
      error: 'Failed to get backlinks',
      details: error.message,
    });
  }
};

/**
 * Get backlink metrics for a website
 * GET /api/backlinks/:websiteId/metrics
 */
const getBacklinkMetricsForWebsite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get metrics
    const metrics = await getBacklinkMetrics(websiteId);

    res.json(metrics);
  } catch (error) {
    console.error('❌ Get backlink metrics error:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      details: error.message,
    });
  }
};

/**
 * Get backlink history for a website
 * GET /api/backlinks/:websiteId/history
 * Query params: days (default: 30)
 */
const getBacklinkHistoryForWebsite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { days = 30 } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get history
    const history = await getBacklinkHistory(websiteId, parseInt(days));

    res.json({
      websiteId: parseInt(websiteId),
      days: parseInt(days),
      history,
    });
  } catch (error) {
    console.error('❌ Get backlink history error:', error);
    res.status(500).json({
      error: 'Failed to get history',
      details: error.message,
    });
  }
};

/**
 * Get backlink check history for a website
 * GET /api/backlinks/:websiteId/checks
 */
const getBacklinkCheckHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get check history
    const result = await pool.query(
      `SELECT
         id,
         check_date,
         check_status,
         total_backlinks,
         new_backlinks_count,
         lost_backlinks_count,
         total_referring_domains
       FROM backlink_checks
       WHERE website_id = $1
       ORDER BY check_date DESC
       LIMIT 20`,
      [websiteId]
    );

    res.json({
      websiteId: parseInt(websiteId),
      checks: result.rows,
    });
  } catch (error) {
    console.error('❌ Get check history error:', error);
    res.status(500).json({
      error: 'Failed to get check history',
      details: error.message,
    });
  }
};

module.exports = {
  checkBacklinks,
  getLatestBacklinksForWebsite,
  getBacklinkMetricsForWebsite,
  getBacklinkHistoryForWebsite,
  getBacklinkCheckHistory,
};
