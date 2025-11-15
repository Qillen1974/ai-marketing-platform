const express = require('express');
const router = express.Router();
const {
  checkRankings,
  getLatestRankingsForWebsite,
  getRankingHistoryForKeyword,
  getRankingMetricsForWebsite,
} = require('../controllers/rankingController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/rankings/:websiteId/check
 * Check/update all keyword rankings for a website
 */
router.post('/:websiteId/check', checkRankings);

/**
 * GET /api/rankings/:websiteId/latest
 * Get latest ranking data for all keywords
 */
router.get('/:websiteId/latest', getLatestRankingsForWebsite);

/**
 * GET /api/rankings/:websiteId/metrics
 * Get ranking metrics and statistics
 */
router.get('/:websiteId/metrics', getRankingMetricsForWebsite);

/**
 * GET /api/rankings/:websiteId/history/:keywordId
 * Get ranking history for a specific keyword
 * Query params: ?days=30
 */
router.get('/:websiteId/history/:keywordId', getRankingHistoryForKeyword);

module.exports = router;
