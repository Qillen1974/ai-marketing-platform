const express = require('express');
const router = express.Router();
const {
  getKeywordResearch,
  getWebsiteKeywords,
  addKeyword,
  getSuggestedKeywords,
} = require('../controllers/keywordController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.get('/:websiteId/suggestions', getSuggestedKeywords);
router.get('/:websiteId/research', getKeywordResearch);
router.get('/:websiteId', getWebsiteKeywords);
router.post('/:websiteId', addKeyword);

module.exports = router;
