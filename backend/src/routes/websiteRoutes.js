const express = require('express');
const router = express.Router();
const {
  addWebsite,
  getWebsites,
  getWebsite,
  updateWebsite,
  deleteWebsite,
} = require('../controllers/websiteController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.post('/', addWebsite);
router.get('/', getWebsites);
router.get('/:websiteId', getWebsite);
router.put('/:websiteId', updateWebsite);
router.delete('/:websiteId', deleteWebsite);

module.exports = router;
