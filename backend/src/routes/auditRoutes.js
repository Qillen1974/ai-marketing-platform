const express = require('express');
const router = express.Router();
const { runAudit, getAuditHistory, getAuditReport } = require('../controllers/auditController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.post('/:websiteId/run', runAudit);
router.get('/:websiteId/history', getAuditHistory);
router.get('/:websiteId/report/:reportId', getAuditReport);

module.exports = router;
