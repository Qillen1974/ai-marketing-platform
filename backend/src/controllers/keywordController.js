const { pool } = require('../config/database');
const { getKeywordResearch: performKeywordResearch, getSuggestedKeywordsWithMetrics } = require('../services/seoService');

// Get keyword research for a website
const getKeywordResearch = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { limit = 20 } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT domain, target_keywords FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // Check if we have cached keywords
    const cachedKeywords = await pool.query(
      'SELECT * FROM keywords WHERE website_id = $1 ORDER BY search_volume DESC LIMIT $2',
      [websiteId, limit]
    );

    if (cachedKeywords.rows.length > 0) {
      const keywords = cachedKeywords.rows.map((k) => ({
        id: k.id,
        keyword: k.keyword,
        searchVolume: k.search_volume,
        difficulty: k.difficulty,
        currentPosition: k.current_position,
        trend: k.trend,
        lastUpdated: k.last_updated,
      }));

      return res.json({ keywords, cached: true });
    }

    // Perform keyword research
    const keywords = await performKeywordResearch(website.domain, website.target_keywords);

    // Save keywords to database
    for (const kw of keywords.slice(0, limit)) {
      await pool.query(
        `INSERT INTO keywords (website_id, keyword, search_volume, difficulty, current_position, trend)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (website_id, keyword) DO UPDATE
         SET search_volume = $3, difficulty = $4, current_position = $5, trend = $6, last_updated = NOW()`,
        [websiteId, kw.keyword, kw.searchVolume, kw.difficulty, kw.currentPosition, kw.trend]
      );
    }

    const formattedKeywords = keywords.slice(0, limit).map((k) => ({
      keyword: k.keyword,
      searchVolume: k.searchVolume,
      difficulty: k.difficulty,
      currentPosition: k.currentPosition,
      trend: k.trend,
      cpc: k.cpc,
    }));

    res.json({ keywords: formattedKeywords, cached: false });
  } catch (error) {
    console.error('Get keyword research error:', error);
    res.status(500).json({ error: 'Failed to get keyword research' });
  }
};

// Get all keywords for a website
const getWebsiteKeywords = async (req, res) => {
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

    const result = await pool.query(
      `SELECT id, keyword, search_volume, difficulty, current_position, trend, last_updated
       FROM keywords
       WHERE website_id = $1
       ORDER BY search_volume DESC`,
      [websiteId]
    );

    const keywords = result.rows.map((k) => ({
      id: k.id,
      keyword: k.keyword,
      searchVolume: k.search_volume,
      difficulty: k.difficulty,
      currentPosition: k.current_position,
      trend: k.trend,
      lastUpdated: k.last_updated,
    }));

    res.json({ keywords });
  } catch (error) {
    console.error('Get website keywords error:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
};

// Add a keyword to track
const addKeyword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { keyword } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Add keyword
    const result = await pool.query(
      `INSERT INTO keywords (website_id, keyword, search_volume, difficulty)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (website_id, keyword) DO UPDATE
       SET last_updated = NOW()
       RETURNING id, keyword, search_volume, difficulty`,
      [websiteId, keyword.toLowerCase(), Math.floor(Math.random() * 10000) + 100, Math.floor(Math.random() * 100)]
    );

    const addedKeyword = result.rows[0];

    res.status(201).json({
      message: 'Keyword added successfully',
      keyword: {
        id: addedKeyword.id,
        keyword: addedKeyword.keyword,
        searchVolume: addedKeyword.search_volume,
        difficulty: addedKeyword.difficulty,
      },
    });
  } catch (error) {
    console.error('Add keyword error:', error);
    res.status(500).json({ error: 'Failed to add keyword' });
  }
};

// Get keyword suggestions based on website content
const getSuggestedKeywords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT domain FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // Get suggested keywords with metrics
    const suggestedKeywords = await getSuggestedKeywordsWithMetrics(website.domain);

    res.json({
      keywords: suggestedKeywords,
      message: `Found ${suggestedKeywords.length} keyword suggestions for ${website.domain}`,
    });
  } catch (error) {
    console.error('Get suggested keywords error:', error);
    res.status(500).json({ error: 'Failed to get keyword suggestions' });
  }
};

module.exports = {
  getKeywordResearch,
  getWebsiteKeywords,
  addKeyword,
  getSuggestedKeywords,
};
