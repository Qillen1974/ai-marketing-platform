const express = require('express');
const router = express.Router();
const {
  discoverCommunities,
  getCommunities,
  trackCommunity,
  logParticipation,
  getParticipations,
} = require('../controllers/redditController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/reddit/:websiteId/discover
 * Discover Reddit communities for a website
 */
router.post('/:websiteId/discover', discoverCommunities);

/**
 * GET /api/reddit/:websiteId/communities
 * Get all Reddit communities for a website
 * Query params: ?tracked=true&difficulty=easy&limit=20&offset=0
 */
router.get('/:websiteId/communities', getCommunities);

/**
 * PUT /api/reddit/:websiteId/communities/:communityId/track
 * Track or untrack a community
 */
router.put('/:websiteId/communities/:communityId/track', trackCommunity);

/**
 * POST /api/reddit/:websiteId/communities/:communityId/log-participation
 * Log a participation/post in a community
 */
router.post('/:websiteId/communities/:communityId/log-participation', logParticipation);

/**
 * GET /api/reddit/:websiteId/communities/:communityId/participations
 * Get participation history for a community
 */
router.get('/:websiteId/communities/:communityId/participations', getParticipations);

module.exports = router;
