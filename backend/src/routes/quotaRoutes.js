const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getQuota, checkQuota } = require('../controllers/quotaController');

// Middleware
router.use(authMiddleware);

// Get user's quota and usage
router.get('/', getQuota);

// Check if user can perform an action
router.post('/check', checkQuota);

module.exports = router;
