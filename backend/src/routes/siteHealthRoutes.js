const express = require('express');
const router = express.Router();
const siteHealthController = require('../controllers/siteHealthController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/site-health/audit
 * Start a new website health audit
 */
router.post('/audit', siteHealthController.runSiteHealthAudit);

/**
 * GET /api/site-health/audit-status
 * Check audit progress
 */
router.get('/audit-status', siteHealthController.getAuditStatus);

/**
 * POST /api/site-health/audit-report
 * Get completed audit report and save health score
 */
router.post('/audit-report', siteHealthController.getAuditReport);

/**
 * GET /api/site-health/:websiteId/dashboard
 * Get site health dashboard with trends
 */
router.get('/:websiteId/dashboard', siteHealthController.getSiteHealthDashboard);

/**
 * POST /api/site-health/quick-wins
 * Generate quick wins recommendations
 */
router.post('/quick-wins', siteHealthController.generateQuickWins);

/**
 * GET /api/site-health/:websiteId/quick-wins
 * Get latest quick wins report
 */
router.get('/:websiteId/quick-wins', siteHealthController.getQuickWinsReport);

module.exports = router;
