const express = require('express');
const router = express.Router();
const competitorController = require('../controllers/competitorAnalysisController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/competitors/backlinks
 * Analyze competitor backlinks and find opportunities
 */
router.post('/backlinks', competitorController.analyzeCompetitorBacklinks);

/**
 * POST /api/competitors/keywords
 * Perform keyword gap analysis between user and competitor
 */
router.post('/keywords', competitorController.analyzeCompetitorKeywords);

/**
 * GET /api/competitors/:userId/analyses
 * Get all competitor analyses for a user
 */
router.get('/:userId/analyses', competitorController.getCompetitorAnalyses);

/**
 * GET /api/competitors/analyses/:analysisId
 * Get a specific competitor analysis
 */
router.get('/analyses/:analysisId', competitorController.getCompetitorAnalysis);

/**
 * DELETE /api/competitors/analyses/:analysisId
 * Delete a competitor analysis
 */
router.delete('/analyses/:analysisId', competitorController.deleteCompetitorAnalysis);

module.exports = router;
