const express = require('express');
const router = express.Router();
const {
  discoverCommunities,
  getCommunities,
  trackCommunity,
  logParticipation,
  getParticipations,
  discoverThreads,
  getThreads,
} = require('../controllers/redditController');
const { authMiddleware } = require('../middleware/auth');

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

/**
 * POST /api/reddit/:websiteId/communities/:communityId/threads
 * Discover relevant threads in a community
 */
router.post('/:websiteId/communities/:communityId/threads', discoverThreads);

/**
 * GET /api/reddit/:websiteId/communities/:communityId/threads
 * Get discovered threads for a community
 * Query params: ?limit=20&offset=0
 */
router.get('/:websiteId/communities/:communityId/threads', getThreads);

module.exports = router;
