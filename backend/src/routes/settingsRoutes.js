const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getApiKeys,
  saveApiKey,
  deleteApiKey,
  setPreferredAiProvider,
  getPreferredAiProvider
} = require('../controllers/settingsController');

// Middleware
router.use(authenticateToken);

// Get user's API keys
router.get('/api-keys', getApiKeys);

// Save API key
router.post('/api-keys', saveApiKey);

// Delete API key
router.delete('/api-keys/:provider', deleteApiKey);

// Set preferred AI provider
router.post('/preferred-ai-provider', setPreferredAiProvider);

// Get preferred AI provider
router.get('/preferred-ai-provider', getPreferredAiProvider);

module.exports = router;
