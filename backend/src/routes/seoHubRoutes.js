/**
 * SEO Hub Routes
 * Unified dashboard endpoints for the SEO command center
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getDashboard,
  syncKeywords,
  getKeywords,
  getBacklinksByKeyword,
  getSEOScore,
  getWebsitesWithSEOStatus,
} = require('../controllers/seoHubController');

// All routes require authentication
router.use(authMiddleware);

// Website listing with SEO status
router.get('/websites', getWebsitesWithSEOStatus);

// Per-website endpoints
router.get('/:websiteId/dashboard', getDashboard);
router.post('/:websiteId/sync', syncKeywords);
router.get('/:websiteId/keywords', getKeywords);
router.get('/:websiteId/backlinks-by-keyword', getBacklinksByKeyword);
router.get('/:websiteId/seo-score', getSEOScore);

module.exports = router;
