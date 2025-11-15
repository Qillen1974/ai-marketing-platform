const { pool } = require('../config/database');
const {
  checkAllKeywordRankings,
  getRankingHistory,
  getLatestRankings,
  getRankingMetrics,
} = require('../services/rankingService');

/**
 * Check all keyword rankings for a website
 * POST /api/rankings/:websiteId/check
 */
const checkRankings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id, domain FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];
    const domain = website.domain.replace(/^www\./, ''); // Remove www if present

    console.log(`📊 Starting ranking check for ${domain}`);

    // Check all rankings
    const rankings = await checkAllKeywordRankings(websiteId, domain);

    // Calculate metrics
    const metrics = await getRankingMetrics(websiteId);

    console.log(`✅ Ranking check completed for ${websiteId}`);

    res.json({
      message: 'Ranking check completed',
      domain,
      rankings,
      metrics,
    });
  } catch (error) {
    console.error('Check rankings error:', error);
    res.status(500).json({ error: 'Failed to check rankings' });
  }
};

/**
 * Get latest rankings for a website
 * GET /api/rankings/:websiteId/latest
 */
const getLatestRankingsForWebsite = async (req, res) => {
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

    // Get latest rankings
    const rankings = await getLatestRankings(websiteId);

    // Get metrics
    const metrics = await getRankingMetrics(websiteId);

    res.json({
      rankings,
      metrics,
    });
  } catch (error) {
    console.error('Get latest rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch latest rankings' });
  }
};

/**
 * Get ranking history for a keyword
 * GET /api/rankings/:websiteId/history/:keywordId?days=30
 */
const getRankingHistoryForKeyword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, keywordId } = req.params;
    const { days = 30 } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Verify keyword belongs to website
    const keywordResult = await pool.query(
      'SELECT keyword FROM keywords WHERE id = $1 AND website_id = $2',
      [keywordId, websiteId]
    );

    if (keywordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    // Get ranking history
    const history = await getRankingHistory(keywordId, parseInt(days));

    res.json({
      keyword: keywordResult.rows[0].keyword,
      keywordId,
      days: parseInt(days),
      history,
    });
  } catch (error) {
    console.error('Get ranking history error:', error);
    res.status(500).json({ error: 'Failed to fetch ranking history' });
  }
};

/**
 * Get ranking metrics/stats for a website
 * GET /api/rankings/:websiteId/metrics
 */
const getRankingMetricsForWebsite = async (req, res) => {
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
    const metrics = await getRankingMetrics(websiteId);

    res.json(metrics);
  } catch (error) {
    console.error('Get ranking metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch ranking metrics' });
  }
};

module.exports = {
  checkRankings,
  getLatestRankingsForWebsite,
  getRankingHistoryForKeyword,
  getRankingMetricsForWebsite,
};
