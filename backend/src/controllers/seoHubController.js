/**
 * SEO Hub Controller
 * Unified dashboard endpoints for the SEO command center
 */

const { pool } = require('../config/database');
const {
  syncCampaignKeywordsToRankings,
  matchBacklinksToKeywords,
  calculateCampaignSEOScore,
  getKeywordsWithData,
  getBacklinksGroupedByKeyword,
} = require('../services/keywordSyncService');
const { getCampaign, getArticles } = require('../services/articleGenerationService');

/**
 * GET /api/seo-hub/:websiteId/dashboard
 * Get unified SEO dashboard data for a website
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    console.log(`📊 Loading SEO Hub dashboard for website ${websiteId}`);

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id, domain FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // Fetch all data in parallel
    const [campaign, keywordsWithData, backlinksData, articlesData, seoScore] = await Promise.all([
      getCampaign(websiteId),
      getKeywordsWithData(websiteId),
      getBacklinksGroupedByKeyword(websiteId),
      getArticles(websiteId, 10, 0),
      calculateCampaignSEOScore(websiteId),
    ]);

    // Calculate summary stats
    const totalKeywords = keywordsWithData.length;
    const keywordsRanking = keywordsWithData.filter(k => k.position && k.position > 0).length;
    const keywordsInTop10 = keywordsWithData.filter(k => k.position && k.position <= 10).length;
    const keywordsInTop3 = keywordsWithData.filter(k => k.position && k.position <= 3).length;
    const avgPosition = keywordsRanking > 0
      ? keywordsWithData
          .filter(k => k.position && k.position > 0)
          .reduce((sum, k) => sum + k.position, 0) / keywordsRanking
      : null;

    res.json({
      website: {
        id: website.id,
        domain: website.domain,
      },
      campaign: campaign ? {
        id: campaign.id,
        websiteName: campaign.website_name,
        websiteDescription: campaign.website_description,
        targetUrl: campaign.target_url,
        autoKeywords: campaign.auto_keywords || [],
        customKeywords: campaign.custom_keywords || [],
        seoScore: campaign.seo_score || seoScore,
        keywordsSyncedAt: campaign.keywords_synced_at,
        lastArticleDate: campaign.last_article_date,
        totalArticlesGenerated: campaign.total_articles_generated,
      } : null,
      keywords: keywordsWithData,
      backlinks: backlinksData,
      articles: {
        items: articlesData.articles,
        total: articlesData.total,
      },
      summary: {
        totalKeywords,
        keywordsRanking,
        keywordsInTop10,
        keywordsInTop3,
        avgPosition: avgPosition ? parseFloat(avgPosition.toFixed(1)) : null,
        totalBacklinks: backlinksData.total,
        backlinksMatchedToKeywords: backlinksData.matchedToKeywords,
        articlesGenerated: articlesData.total,
        seoScore: seoScore,
      },
    });
  } catch (error) {
    console.error('❌ Error loading SEO Hub dashboard:', error);
    res.status(500).json({
      error: 'Failed to load dashboard',
      details: error.message,
    });
  }
};

/**
 * POST /api/seo-hub/:websiteId/sync
 * Force sync keywords from campaign to rankings system
 */
const syncKeywords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    console.log(`🔄 Manual keyword sync requested for website ${websiteId}`);

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get campaign
    const campaign = await getCampaign(websiteId);
    if (!campaign) {
      return res.status(404).json({ error: 'No article campaign found for this website' });
    }

    // Sync keywords
    const syncResult = await syncCampaignKeywordsToRankings(websiteId, campaign.id);

    // Match backlinks to keywords
    const matchResult = await matchBacklinksToKeywords(websiteId);

    // Calculate new SEO score
    const seoScore = await calculateCampaignSEOScore(websiteId);

    res.json({
      message: 'Keywords synced successfully',
      sync: syncResult,
      matching: matchResult,
      seoScore,
    });
  } catch (error) {
    console.error('❌ Error syncing keywords:', error);
    res.status(500).json({
      error: 'Failed to sync keywords',
      details: error.message,
    });
  }
};

/**
 * GET /api/seo-hub/:websiteId/keywords
 * Get keywords with ranking and backlink data
 */
const getKeywords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const keywords = await getKeywordsWithData(websiteId);

    res.json({
      keywords,
      total: keywords.length,
    });
  } catch (error) {
    console.error('❌ Error getting keywords:', error);
    res.status(500).json({
      error: 'Failed to get keywords',
      details: error.message,
    });
  }
};

/**
 * GET /api/seo-hub/:websiteId/backlinks-by-keyword
 * Get backlinks grouped by the keywords they support
 */
const getBacklinksByKeyword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const backlinks = await getBacklinksGroupedByKeyword(websiteId);

    res.json(backlinks);
  } catch (error) {
    console.error('❌ Error getting backlinks by keyword:', error);
    res.status(500).json({
      error: 'Failed to get backlinks',
      details: error.message,
    });
  }
};

/**
 * GET /api/seo-hub/:websiteId/seo-score
 * Get current SEO score and recalculate if needed
 */
const getSEOScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { recalculate } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    let seoScore;
    if (recalculate === 'true') {
      seoScore = await calculateCampaignSEOScore(websiteId);
    } else {
      const campaign = await getCampaign(websiteId);
      seoScore = campaign?.seo_score || await calculateCampaignSEOScore(websiteId);
    }

    res.json({
      seoScore,
      websiteId: parseInt(websiteId),
    });
  } catch (error) {
    console.error('❌ Error getting SEO score:', error);
    res.status(500).json({
      error: 'Failed to get SEO score',
      details: error.message,
    });
  }
};

/**
 * GET /api/seo-hub/websites
 * Get all websites with their SEO Hub status
 */
const getWebsitesWithSEOStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        w.id,
        w.domain,
        ac.id as campaign_id,
        ac.seo_score,
        ac.keywords_synced_at,
        ac.last_article_date,
        ac.total_articles_generated,
        (SELECT COUNT(*) FROM keywords k WHERE k.website_id = w.id AND k.campaign_id = ac.id) as keyword_count,
        (SELECT COUNT(*) FROM backlinks b WHERE b.website_id = w.id AND b.status = 'active') as backlink_count
      FROM websites w
      LEFT JOIN article_campaigns ac ON ac.website_id = w.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId]);

    const websites = result.rows.map(row => ({
      id: row.id,
      domain: row.domain,
      hasCampaign: !!row.campaign_id,
      seoScore: row.seo_score || 0,
      keywordCount: parseInt(row.keyword_count) || 0,
      backlinkCount: parseInt(row.backlink_count) || 0,
      articlesGenerated: row.total_articles_generated || 0,
      lastArticleDate: row.last_article_date,
      keywordsSyncedAt: row.keywords_synced_at,
    }));

    res.json({
      websites,
      total: websites.length,
    });
  } catch (error) {
    console.error('❌ Error getting websites with SEO status:', error);
    res.status(500).json({
      error: 'Failed to get websites',
      details: error.message,
    });
  }
};

module.exports = {
  getDashboard,
  syncKeywords,
  getKeywords,
  getBacklinksByKeyword,
  getSEOScore,
  getWebsitesWithSEOStatus,
};
