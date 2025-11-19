const { pool } = require('../config/database');
const seRankingApi = require('../services/seRankingApiService');

// ============================================
// COMPETITOR BACKLINK ANALYSIS
// ============================================

/**
 * Analyze competitor backlinks and compare with user's domain
 * Shows: Top referring domains, anchor texts, backlink gaps
 */
const analyzeCompetitorBacklinks = async (req, res) => {
  try {
    const { competitorDomain, userDomain, userId } = req.body;

    // Validate input
    if (!competitorDomain || !seRankingApi.isValidDomain(competitorDomain)) {
      return res.status(400).json({ error: 'Invalid competitor domain' });
    }

    if (!userDomain || !seRankingApi.isValidDomain(userDomain)) {
      return res.status(400).json({ error: 'Invalid user domain' });
    }

    console.log(`🔍 Analyzing competitor backlinks: ${competitorDomain} vs ${userDomain}`);

    // Fetch backlink data for both domains
    const [competitorBacklinks, userBacklinks] = await Promise.all([
      seRankingApi.getBacklinkStats(competitorDomain),
      seRankingApi.getBacklinkStats(userDomain),
    ]);

    if (!competitorBacklinks) {
      return res.status(404).json({ error: `No backlink data found for ${competitorDomain}` });
    }

    // Get top referring domains for competitor
    const competitorReferringDomains = await seRankingApi.getTopReferringDomains(
      competitorDomain,
      100
    );

    // Get top referring domains for user
    const userReferringDomains = await seRankingApi.getTopReferringDomains(userDomain, 100);

    // Get anchor texts
    const [competitorAnchorTexts, userAnchorTexts] = await Promise.all([
      seRankingApi.getAnchorTexts(competitorDomain, 50),
      seRankingApi.getAnchorTexts(userDomain, 50),
    ]);

    // Calculate gaps
    const competitorDomainSet = new Set(
      competitorReferringDomains.map((d) => d.domain.toLowerCase())
    );
    const userDomainSet = new Set(userReferringDomains.map((d) => d.domain.toLowerCase()));

    // Domains linking to competitor but not user
    const backlinkGaps = competitorReferringDomains.filter(
      (d) => !userDomainSet.has(d.domain.toLowerCase())
    );

    // Analyze anchor text strategies
    const competitorTopAnchors = (competitorAnchorTexts || []).slice(0, 10);
    const userTopAnchors = (userAnchorTexts || []).slice(0, 10);

    // Save analysis to database
    const analysisResult = await pool.query(
      `INSERT INTO competitor_analyses (
        user_id, competitor_domain, user_domain,
        competitor_backlinks, user_backlinks,
        gap_opportunities, analysis_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        userId,
        competitorDomain,
        userDomain,
        competitorBacklinks.backlinksCount || 0,
        userBacklinks?.backlinksCount || 0,
        backlinkGaps.length,
        JSON.stringify({
          competitorStats: competitorBacklinks,
          userStats: userBacklinks,
          backlinkGaps: backlinkGaps.slice(0, 50),
          competitorTopAnchors,
          userTopAnchors,
        }),
      ]
    );

    console.log(`✅ Competitor analysis saved for ${competitorDomain}`);

    res.json({
      analysis: {
        competitor: competitorDomain,
        user: userDomain,
        competitorBacklinks: competitorBacklinks.backlinksCount || 0,
        userBacklinks: userBacklinks?.backlinksCount || 0,
        backlinkGapCount: backlinkGaps.length,
        backlinkGaps: backlinkGaps.slice(0, 50).map((d) => ({
          domain: d.domain,
          backlinksCount: d.backlinksCount,
          trafficEstimate: d.trafficEstimate,
          authority: d.authority,
          type: 'opportunity', // This is a domain linking to competitor
        })),
        competitorReferringDomains: competitorReferringDomains.slice(0, 20),
        userReferringDomains: userReferringDomains.slice(0, 20),
        competitorTopAnchors,
        userTopAnchors,
        competitorStats: competitorBacklinks,
        userStats: userBacklinks,
      },
    });
  } catch (error) {
    console.error('❌ Error analyzing competitor backlinks:', error.message);
    res.status(500).json({ error: 'Failed to analyze competitor backlinks' });
  }
};

// ============================================
// COMPETITOR KEYWORD ANALYSIS (GAP ANALYSIS)
// ============================================

/**
 * Find keyword gaps between user and competitor
 * Shows: Keywords competitor ranks for but user doesn't
 */
const analyzeCompetitorKeywords = async (req, res) => {
  try {
    const { competitorDomain, userDomain, countryCode = 'US', userId } = req.body;

    if (!competitorDomain || !userDomain) {
      return res.status(400).json({ error: 'Competitor and user domain required' });
    }

    console.log(`🔑 Analyzing keyword gaps: ${competitorDomain} vs ${userDomain}`);

    // Get keywords for both domains
    const [competitorKeywords, userKeywords] = await Promise.all([
      seRankingApi.getDomainKeywords(competitorDomain, countryCode, 500),
      seRankingApi.getDomainKeywords(userDomain, countryCode, 500),
    ]);

    if (!competitorKeywords.length) {
      return res.status(404).json({ error: 'No keyword data found' });
    }

    // Create sets for comparison
    const userKeywordSet = new Set(userKeywords.map((k) => k.keyword.toLowerCase()));
    const competitorKeywordSet = new Set(competitorKeywords.map((k) => k.keyword.toLowerCase()));

    // Find gaps
    const keywordGaps = competitorKeywords.filter(
      (k) => !userKeywordSet.has(k.keyword.toLowerCase())
    );

    const competitorExclusiveKeywords = competitorKeywords.filter(
      (k) => !userKeywordSet.has(k.keyword.toLowerCase())
    );

    const userExclusiveKeywords = userKeywords.filter(
      (k) => !competitorKeywordSet.has(k.keyword.toLowerCase())
    );

    // Sort by traffic potential
    const sortedGaps = competitorExclusiveKeywords
      .sort((a, b) => (b.trafficEstimate || 0) - (a.trafficEstimate || 0))
      .slice(0, 100);

    // Save analysis
    await pool.query(
      `INSERT INTO keyword_gap_analyses (
        user_id, competitor_domain, user_domain,
        common_keywords_count, competitor_exclusive_count, user_exclusive_count,
        analysis_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        competitorDomain,
        userDomain,
        competitorKeywordSet.size - keywordGaps.length,
        keywordGaps.length,
        userExclusiveKeywords.length,
        JSON.stringify({
          gaps: sortedGaps,
          userExclusive: userExclusiveKeywords.slice(0, 50),
        }),
      ]
    );

    res.json({
      analysis: {
        competitor: competitorDomain,
        user: userDomain,
        commonKeywordsCount: competitorKeywordSet.size - keywordGaps.length,
        gapOpportunitiesCount: keywordGaps.length,
        userExclusiveCount: userExclusiveKeywords.length,
        topGapKeywords: sortedGaps.slice(0, 20).map((k) => ({
          keyword: k.keyword,
          position: k.position,
          trafficEstimate: k.trafficEstimate,
          difficulty: k.difficulty,
          url: k.url,
          opportunity: 'medium', // Could be calculated based on difficulty and traffic
        })),
        allGapKeywords: sortedGaps,
      },
    });
  } catch (error) {
    console.error('❌ Error analyzing competitor keywords:', error.message);
    res.status(500).json({ error: 'Failed to analyze competitor keywords' });
  }
};

// ============================================
// GET SAVED ANALYSES
// ============================================

/**
 * Get user's saved competitor analyses
 */
const getCompetitorAnalyses = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT * FROM competitor_analyses
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching competitor analyses:', error.message);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
};

/**
 * Get specific competitor analysis
 */
const getCompetitorAnalysis = async (req, res) => {
  try {
    const { analysisId } = req.params;

    const result = await pool.query(
      `SELECT * FROM competitor_analyses WHERE id = $1`,
      [analysisId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching analysis:', error.message);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
};

// ============================================
// DELETE ANALYSIS
// ============================================

/**
 * Delete a competitor analysis
 */
const deleteCompetitorAnalysis = async (req, res) => {
  try {
    const { analysisId } = req.params;

    await pool.query(`DELETE FROM competitor_analyses WHERE id = $1`, [analysisId]);

    res.json({ message: 'Analysis deleted' });
  } catch (error) {
    console.error('❌ Error deleting analysis:', error.message);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
};

module.exports = {
  analyzeCompetitorBacklinks,
  analyzeCompetitorKeywords,
  getCompetitorAnalyses,
  getCompetitorAnalysis,
  deleteCompetitorAnalysis,
};
