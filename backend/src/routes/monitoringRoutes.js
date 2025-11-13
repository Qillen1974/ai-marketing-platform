const express = require('express');
const router = express.Router();
const {
  addAcquiredBacklink,
  getAcquiredBacklinks,
  verifyAcquiredBacklink,
  checkAllWebsiteBacklinks,
  getBacklinkHealth,
} = require('../controllers/monitoringController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Add acquired backlink
router.post('/:websiteId/acquired', addAcquiredBacklink);

// Get acquired backlinks
router.get('/:websiteId/acquired', getAcquiredBacklinks);

// Verify specific backlink
router.post('/:websiteId/acquired/:backlinkId/verify', verifyAcquiredBacklink);

// Check all backlinks for a website
router.post('/:websiteId/check-all', checkAllWebsiteBacklinks);

// Get backlink health summary
router.get('/:websiteId/health', getBacklinkHealth);

module.exports = router;
