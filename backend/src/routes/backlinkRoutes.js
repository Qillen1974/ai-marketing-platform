const express = require('express');
const router = express.Router();
const {
  discoverOpportunities,
  getOpportunities,
  getOpportunity,
  updateOpportunity,
  getCampaignStats,
} = require('../controllers/backlinkController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Discover backlink opportunities
router.post('/:websiteId/discover', discoverOpportunities);

// Get all opportunities for a website
router.get('/:websiteId/opportunities', getOpportunities);

// Get specific opportunity
router.get('/:websiteId/opportunities/:opportunityId', getOpportunity);

// Update opportunity (status, notes)
router.put('/:websiteId/opportunities/:opportunityId', updateOpportunity);

// Get campaign statistics
router.get('/:websiteId/stats', getCampaignStats);

module.exports = router;
