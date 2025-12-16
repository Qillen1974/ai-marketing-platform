const express = require('express');
const router = express.Router();
const {
  checkBacklinks,
  getLatestBacklinksForWebsite,
  getBacklinkMetricsForWebsite,
  getBacklinkHistoryForWebsite,
  getBacklinkCheckHistory,
} = require('../controllers/backlinksMonitorController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/backlinks/:websiteId/check
 * Trigger backlink check for a website
 */
router.post('/:websiteId/check', checkBacklinks);

/**
 * GET /api/backlinks/:websiteId/latest
 * Get latest backlinks with pagination and filters
 * Query params: limit, offset, status, linkType
 */
router.get('/:websiteId/latest', getLatestBacklinksForWebsite);

/**
 * GET /api/backlinks/:websiteId/metrics
 * Get backlink summary metrics
 */
router.get('/:websiteId/metrics', getBacklinkMetricsForWebsite);

/**
 * GET /api/backlinks/:websiteId/history
 * Get historical backlink data
 * Query params: days (default: 30)
 */
router.get('/:websiteId/history', getBacklinkHistoryForWebsite);

/**
 * GET /api/backlinks/:websiteId/checks
 * Get history of backlink checks
 */
router.get('/:websiteId/checks', getBacklinkCheckHistory);

module.exports = router;
