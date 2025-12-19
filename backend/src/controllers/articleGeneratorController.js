/**
 * Article Generator Controller
 * Handles HTTP requests for article generation feature
 */

const { pool } = require('../config/database');
const articleService = require('../services/articleGenerationService');

/**
 * Analyze a URL and extract keywords
 * POST /api/articles/analyze-url
 */
const analyzeUrl = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`📊 Analyzing URL for user ${userId}: ${url}`);

    const analysis = await articleService.analyzeWebsiteForKeywords(userId, url);

    res.json({
      success: true,
      analysis: {
        keywords: analysis.keywords,
        websiteDescription: analysis.websiteDescription,
        targetAudience: analysis.targetAudience,
        websiteName: analysis.websiteName,
        suggestedTopics: analysis.suggestedTopics,
      },
      tokensUsed: analysis.tokensUsed,
    });
  } catch (error) {
    console.error('Error analyzing URL:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to analyze URL',
    });
  }
};

/**
 * Create a new article campaign
 * POST /api/articles/campaigns
 */
const createCampaign = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, targetUrl, websiteName, websiteDescription, targetAudience, autoKeywords, customKeywords } =
      req.body;

    if (!websiteId || !targetUrl) {
      return res.status(400).json({ error: 'Website ID and target URL are required' });
    }

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id, domain FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const campaign = await articleService.createCampaign(websiteId, userId, {
      targetUrl,
      websiteName: websiteName || websiteResult.rows[0].domain,
      websiteDescription,
      targetAudience,
      autoKeywords: autoKeywords || [],
      customKeywords: customKeywords || [],
    });

    res.json({
      success: true,
      message: 'Article campaign created successfully',
      campaign: {
        id: campaign.id,
        websiteId: campaign.website_id,
        targetUrl: campaign.target_url,
        websiteName: campaign.website_name,
        websiteDescription: campaign.website_description,
        targetAudience: campaign.target_audience,
        autoKeywords: campaign.auto_keywords,
        customKeywords: campaign.custom_keywords,
        totalArticles: campaign.total_articles_generated,
      },
    });
  } catch (error) {
    console.error('Error creating campaign:', error.message);
    res.status(500).json({ error: 'Failed to create article campaign' });
  }
};

/**
 * Get campaign for a website
 * GET /api/articles/campaigns/:websiteId
 */
const getCampaign = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id, domain FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const campaign = await articleService.getCampaign(websiteId);

    if (!campaign) {
      return res.json({
        exists: false,
        campaign: null,
      });
    }

    res.json({
      exists: true,
      campaign: {
        id: campaign.id,
        websiteId: campaign.website_id,
        targetUrl: campaign.target_url,
        websiteName: campaign.website_name,
        websiteDescription: campaign.website_description,
        targetAudience: campaign.target_audience,
        autoKeywords: campaign.auto_keywords || [],
        customKeywords: campaign.custom_keywords || [],
        totalArticles: campaign.total_articles_generated,
        lastArticleDate: campaign.last_article_date,
        isActive: campaign.is_active,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign:', error.message);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
};

/**
 * Update campaign keywords
 * PUT /api/articles/campaigns/:websiteId
 */
const updateCampaign = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { autoKeywords, customKeywords, websiteName, websiteDescription, targetAudience } = req.body;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get existing campaign
    const existingCampaign = await articleService.getCampaign(websiteId);
    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Update campaign
    const result = await pool.query(
      `UPDATE article_campaigns
       SET auto_keywords = COALESCE($2, auto_keywords),
           custom_keywords = COALESCE($3, custom_keywords),
           website_name = COALESCE($4, website_name),
           website_description = COALESCE($5, website_description),
           target_audience = COALESCE($6, target_audience),
           updated_at = NOW()
       WHERE website_id = $1
       RETURNING *`,
      [websiteId, autoKeywords, customKeywords, websiteName, websiteDescription, targetAudience]
    );

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating campaign:', error.message);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
};

/**
 * Generate a new article
 * POST /api/articles/:websiteId/generate
 */
const generateArticle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { provider = 'openai' } = req.body;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id, domain FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Validate provider
    const validProviders = ['openai', 'claude', 'gemini'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid AI provider' });
    }

    console.log(`🚀 Generating article for website ${websiteId} using ${provider}`);

    const article = await articleService.generateFullArticle(userId, websiteId, provider);

    res.json({
      success: true,
      message: 'Article generated successfully',
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        metaDescription: article.meta_description,
        targetKeyword: article.target_keyword,
        wordCount: article.word_count,
        provider: article.generation_provider,
        tokensUsed: article.tokens_used,
        generationTimeMs: article.generation_time_ms,
        heroImageUrl: article.hero_image_url,
        createdAt: article.created_at,
      },
    });
  } catch (error) {
    console.error('Error generating article:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to generate article',
    });
  }
};

/**
 * Get all articles for a website
 * GET /api/articles/:websiteId/articles
 */
const getArticles = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const { articles, total } = await articleService.getArticles(
      websiteId,
      parseInt(limit),
      parseInt(offset)
    );

    // Get usage stats
    const usage = await articleService.getUsageStats(userId);

    res.json({
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        metaDescription: a.meta_description,
        targetKeyword: a.target_keyword,
        wordCount: a.word_count,
        provider: a.generation_provider,
        status: a.status,
        heroImageUrl: a.hero_image_url,
        createdAt: a.created_at,
      })),
      total,
      usage: {
        articlesThisMonth: usage.articles_generated,
        tokensUsedThisMonth: usage.tokens_used,
        imagesGeneratedThisMonth: usage.images_generated,
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error.message);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
};

/**
 * Get single article
 * GET /api/articles/:websiteId/articles/:articleId
 */
const getArticle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, articleId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const article = await articleService.getArticleById(articleId, websiteId);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        metaDescription: article.meta_description,
        htmlContent: article.html_content,
        targetKeyword: article.target_keyword,
        secondaryKeywords: article.secondary_keywords,
        wordCount: article.word_count,
        provider: article.generation_provider,
        tokensUsed: article.tokens_used,
        generationTimeMs: article.generation_time_ms,
        status: article.status,
        heroImageUrl: article.hero_image_url,
        contentImages: article.content_images,
        createdAt: article.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching article:', error.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
};

/**
 * Download article as HTML file
 * GET /api/articles/:websiteId/articles/:articleId/html
 */
const downloadArticleHtml = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, articleId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const article = await articleService.getArticleById(articleId, websiteId);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${article.slug || 'article'}.html"`);
    res.send(article.html_content);
  } catch (error) {
    console.error('Error downloading article:', error.message);
    res.status(500).json({ error: 'Failed to download article' });
  }
};

/**
 * Delete an article
 * DELETE /api/articles/:websiteId/articles/:articleId
 */
const deleteArticle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, articleId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const deleted = await articleService.deleteArticle(articleId, websiteId);

    if (!deleted) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting article:', error.message);
    res.status(500).json({ error: 'Failed to delete article' });
  }
};

/**
 * Get article generation stats for dashboard
 * GET /api/articles/:websiteId/stats
 */
const getStats = async (req, res) => {
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

    // Get campaign stats
    const campaign = await articleService.getCampaign(websiteId);

    // Get article count
    const { total } = await articleService.getArticles(websiteId, 1, 0);

    // Get usage stats
    const usage = await articleService.getUsageStats(userId);

    // Get this month's articles
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyResult = await pool.query(
      `SELECT COUNT(*) FROM generated_articles
       WHERE website_id = $1 AND created_at >= $2`,
      [websiteId, monthStart]
    );

    res.json({
      totalArticles: total,
      articlesThisMonth: parseInt(monthlyResult.rows[0].count),
      lastArticleDate: campaign?.last_article_date,
      keywordsCount: (campaign?.auto_keywords?.length || 0) + (campaign?.custom_keywords?.length || 0),
      usage: {
        articlesGenerated: usage.articles_generated,
        tokensUsed: usage.tokens_used,
        imagesGenerated: usage.images_generated,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = {
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
};
