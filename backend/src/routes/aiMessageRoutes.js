const express = require('express');
const router = express.Router();
const {
  generateThreadMessage,
  regenerateThreadMessage,
  updateEngagementMessage,
  getEngagementDetails,
} = require('../controllers/aiMessageController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/ai/reddit/generate-message
 * Generate AI message for a Reddit thread
 * Body: { websiteId, threadId, threadTitle, subredditName, includeLink?, customContext? }
 */
router.post('/reddit/generate-message', generateThreadMessage);

/**
 * POST /api/ai/reddit/regenerate-message
 * Regenerate AI message with different settings
 * Body: { engagementId, threadTitle, subredditName, includeLink?, customContext? }
 */
router.post('/reddit/regenerate-message', regenerateThreadMessage);

/**
 * PUT /api/ai/reddit/engagement/:engagementId
 * Update engagement message (user custom edits)
 * Body: { userCustomMessage, includeLink? }
 */
router.put('/reddit/engagement/:engagementId', updateEngagementMessage);

/**
 * GET /api/ai/reddit/engagement/:engagementId
 * Get engagement details with AI and user messages
 */
router.get('/reddit/engagement/:engagementId', getEngagementDetails);

module.exports = router;
