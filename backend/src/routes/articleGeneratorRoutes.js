/**
 * Article Generator Routes
 * API endpoints for article generation feature
 */

const express = require('express');
const router = express.Router();
const {
  analyzeUrl,
  createCampaign,
  getCampaign,
  updateCampaign,
  generateArticle,
  getArticles,
  getArticle,
  downloadArticleHtml,
  deleteArticle,
  getStats,
} = require('../controllers/articleGeneratorController');
const { authMiddleware } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authMiddleware);

// URL Analysis (onboarding step 1)
router.post('/analyze-url', analyzeUrl);

// Campaign management
router.post('/campaigns', createCampaign);
router.get('/campaigns/:websiteId', getCampaign);
router.put('/campaigns/:websiteId', updateCampaign);

// Article generation and management
router.post('/:websiteId/generate', generateArticle);
router.get('/:websiteId/articles', getArticles);
router.get('/:websiteId/articles/:articleId', getArticle);
router.get('/:websiteId/articles/:articleId/html', downloadArticleHtml);
router.delete('/:websiteId/articles/:articleId', deleteArticle);

// Stats
router.get('/:websiteId/stats', getStats);

module.exports = router;
