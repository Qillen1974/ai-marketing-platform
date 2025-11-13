const express = require('express');
const router = express.Router();
const {
  generateOutreachEmail,
  sendOutreachEmail,
  getOutreachHistory,
  updateOutreachMessage,
  getOutreachStats,
} = require('../controllers/outreachController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Generate email for an opportunity
router.post('/:websiteId/opportunities/:opportunityId/generate-email', generateOutreachEmail);

// Send email for an opportunity
router.post('/:websiteId/opportunities/:opportunityId/send-email', sendOutreachEmail);

// Get outreach history for a website
router.get('/:websiteId/history', getOutreachHistory);

// Update outreach message
router.put('/:websiteId/messages/:messageId', updateOutreachMessage);

// Get outreach statistics
router.get('/:websiteId/stats', getOutreachStats);

module.exports = router;
