/**
 * Keyword Sync Service
 * Manages synchronization of keywords from Article Campaigns to the rankings system
 * and matches backlinks to keywords based on anchor text
 */

const { pool } = require('../config/database');

/**
 * Sync all keywords from an article campaign to the keywords table for ranking tracking
 * @param {number} websiteId - Website ID
 * @param {number} campaignId - Campaign ID
 * @returns {object} - Sync results
 */
const syncCampaignKeywordsToRankings = async (websiteId, campaignId) => {
  console.log(`🔄 Syncing keywords for website ${websiteId}, campaign ${campaignId}`);

  try {
    // Get campaign keywords
    const campaignResult = await pool.query(
      `SELECT auto_keywords, custom_keywords FROM article_campaigns WHERE id = $1 AND website_id = $2`,
      [campaignId, websiteId]
    );

    if (campaignResult.rows.length === 0) {
      console.log('❌ Campaign not found');
      return { synced: 0, error: 'Campaign not found' };
    }

    const campaign = campaignResult.rows[0];
    const autoKeywords = campaign.auto_keywords || [];
    const customKeywords = campaign.custom_keywords || [];

    let syncedCount = 0;
    let updatedCount = 0;

    // Sync auto keywords
    for (const keyword of autoKeywords) {
      const result = await upsertKeyword(websiteId, campaignId, keyword, 'campaign_auto');
      if (result.inserted) syncedCount++;
      else if (result.updated) updatedCount++;
    }

    // Sync custom keywords
    for (const keyword of customKeywords) {
      const result = await upsertKeyword(websiteId, campaignId, keyword, 'campaign_custom');
      if (result.inserted) syncedCount++;
      else if (result.updated) updatedCount++;
    }

    // Update campaign's keywords_synced_at timestamp
    await pool.query(
      `UPDATE article_campaigns SET keywords_synced_at = NOW() WHERE id = $1`,
      [campaignId]
    );

    console.log(`✅ Synced ${syncedCount} new keywords, updated ${updatedCount} existing`);

    return {
      synced: syncedCount,
      updated: updatedCount,
      total: autoKeywords.length + customKeywords.length,
    };
  } catch (error) {
    console.error('❌ Error syncing keywords:', error.message);
    throw error;
  }
};

/**
 * Upsert a keyword into the keywords table
 * @param {number} websiteId - Website ID
 * @param {number} campaignId - Campaign ID
 * @param {string} keyword - Keyword text
 * @param {string} source - Source type ('campaign_auto', 'campaign_custom', 'manual')
 * @returns {object} - { inserted: boolean, updated: boolean }
 */
const upsertKeyword = async (websiteId, campaignId, keyword, source) => {
  try {
    // Check if keyword exists
    const existingResult = await pool.query(
      `SELECT id, source, campaign_id FROM keywords WHERE website_id = $1 AND keyword = $2`,
      [websiteId, keyword]
    );

    if (existingResult.rows.length > 0) {
      // Update existing keyword with campaign link
      await pool.query(
        `UPDATE keywords SET campaign_id = $1, source = $2, last_updated = NOW() WHERE id = $3`,
        [campaignId, source, existingResult.rows[0].id]
      );
      return { inserted: false, updated: true };
    } else {
      // Insert new keyword
      await pool.query(
        `INSERT INTO keywords (website_id, keyword, source, campaign_id, created_at, last_updated)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [websiteId, keyword, source, campaignId]
      );
      return { inserted: true, updated: false };
    }
  } catch (error) {
    console.error(`Error upserting keyword "${keyword}":`, error.message);
    return { inserted: false, updated: false };
  }
};

/**
 * Match backlink anchor texts to campaign keywords
 * @param {number} websiteId - Website ID
 * @returns {object} - Matching results
 */
const matchBacklinksToKeywords = async (websiteId) => {
  console.log(`🔗 Matching backlinks to keywords for website ${websiteId}`);

  try {
    // Get all active backlinks with anchor text
    const backlinksResult = await pool.query(
      `SELECT id, anchor_text FROM backlinks
       WHERE website_id = $1 AND status = 'active' AND anchor_text IS NOT NULL AND anchor_text != ''`,
      [websiteId]
    );

    // Get all keywords for this website
    const keywordsResult = await pool.query(
      `SELECT id, keyword FROM keywords WHERE website_id = $1`,
      [websiteId]
    );

    const backlinks = backlinksResult.rows;
    const keywords = keywordsResult.rows;

    if (backlinks.length === 0 || keywords.length === 0) {
      console.log('📭 No backlinks or keywords to match');
      return { matched: 0, total: 0 };
    }

    let matchedCount = 0;

    // Clear existing matches for this website's backlinks
    await pool.query(
      `DELETE FROM backlink_keyword_matches
       WHERE backlink_id IN (SELECT id FROM backlinks WHERE website_id = $1)`,
      [websiteId]
    );

    // Match each backlink to keywords
    for (const backlink of backlinks) {
      for (const keyword of keywords) {
        const match = matchAnchorToKeyword(backlink.anchor_text, keyword.keyword);

        if (match) {
          try {
            await pool.query(
              `INSERT INTO backlink_keyword_matches (backlink_id, keyword_id, match_type, match_score)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (backlink_id, keyword_id) DO UPDATE SET match_type = $3, match_score = $4`,
              [backlink.id, keyword.id, match.type, match.score]
            );
            matchedCount++;
          } catch (err) {
            // Ignore duplicate errors
          }
        }
      }
    }

    console.log(`✅ Matched ${matchedCount} backlink-keyword pairs`);

    return {
      matched: matchedCount,
      backlinksProcessed: backlinks.length,
      keywordsChecked: keywords.length,
    };
  } catch (error) {
    console.error('❌ Error matching backlinks to keywords:', error.message);
    throw error;
  }
};

/**
 * Match an anchor text to a keyword
 * @param {string} anchorText - Backlink anchor text
 * @param {string} keyword - Target keyword
 * @returns {object|null} - { type: string, score: number } or null if no match
 */
const matchAnchorToKeyword = (anchorText, keyword) => {
  if (!anchorText || !keyword) return null;

  const anchor = anchorText.toLowerCase().trim();
  const kw = keyword.toLowerCase().trim();

  // Exact match (anchor equals keyword or contains exact keyword phrase)
  if (anchor === kw) {
    return { type: 'exact', score: 100 };
  }

  // Contains match (keyword is a substring of anchor)
  if (anchor.includes(kw)) {
    return { type: 'exact', score: 95 };
  }

  // Partial match (keyword words appear in anchor)
  const kwWords = kw.split(/\s+/).filter(w => w.length > 2); // Skip short words
  if (kwWords.length > 0) {
    const matchedWords = kwWords.filter(w => anchor.includes(w));
    if (matchedWords.length > 0) {
      const score = Math.round((matchedWords.length / kwWords.length) * 80);
      if (score >= 40) { // Only count if at least half the words match
        return { type: 'partial', score };
      }
    }
  }

  return null;
};

/**
 * Calculate SEO score for a campaign based on rankings, backlinks, and articles
 * @param {number} websiteId - Website ID
 * @returns {number} - SEO score 0-100
 */
const calculateCampaignSEOScore = async (websiteId) => {
  try {
    // Get campaign
    const campaignResult = await pool.query(
      `SELECT id FROM article_campaigns WHERE website_id = $1`,
      [websiteId]
    );

    if (campaignResult.rows.length === 0) {
      return 0;
    }

    const campaignId = campaignResult.rows[0].id;

    // Get keyword stats
    const keywordStats = await pool.query(`
      SELECT
        COUNT(*) as total_keywords,
        COUNT(CASE WHEN current_position IS NOT NULL AND current_position > 0 THEN 1 END) as ranking_keywords,
        COUNT(CASE WHEN current_position IS NOT NULL AND current_position <= 10 THEN 1 END) as top_10_keywords,
        AVG(CASE WHEN current_position IS NOT NULL AND current_position > 0 THEN current_position END) as avg_position
      FROM keywords
      WHERE website_id = $1 AND campaign_id = $2
    `, [websiteId, campaignId]);

    // Get backlink keyword match stats
    const backlinkStats = await pool.query(`
      SELECT COUNT(DISTINCT k.id) as keywords_with_backlinks
      FROM keywords k
      JOIN backlink_keyword_matches bkm ON k.id = bkm.keyword_id
      WHERE k.website_id = $1 AND k.campaign_id = $2
    `, [websiteId, campaignId]);

    // Get article stats
    const articleStats = await pool.query(`
      SELECT COUNT(DISTINCT target_keyword) as keywords_with_articles
      FROM generated_articles
      WHERE website_id = $1 AND campaign_id = $2
    `, [websiteId, campaignId]);

    const stats = keywordStats.rows[0];
    const totalKeywords = parseInt(stats.total_keywords) || 0;

    if (totalKeywords === 0) {
      return 0;
    }

    const rankingKeywords = parseInt(stats.ranking_keywords) || 0;
    const topTenKeywords = parseInt(stats.top_10_keywords) || 0;
    const avgPosition = parseFloat(stats.avg_position) || 100;
    const keywordsWithBacklinks = parseInt(backlinkStats.rows[0]?.keywords_with_backlinks) || 0;
    const keywordsWithArticles = parseInt(articleStats.rows[0]?.keywords_with_articles) || 0;

    // Calculate score components
    let score = 0;

    // 35%: Keywords ranking (any position)
    const rankingPct = rankingKeywords / totalKeywords;
    score += rankingPct * 35;

    // 25%: Keywords in top 10
    const topTenPct = topTenKeywords / totalKeywords;
    score += topTenPct * 25;

    // 20%: Average position (inverted, better position = higher score)
    const positionScore = avgPosition < 100 ? Math.max(0, (100 - avgPosition)) / 100 : 0;
    score += positionScore * 20;

    // 15%: Backlinks supporting keywords
    const backlinkCoverage = keywordsWithBacklinks / totalKeywords;
    score += backlinkCoverage * 15;

    // 5%: Articles covering keywords
    const articleCoverage = keywordsWithArticles / totalKeywords;
    score += articleCoverage * 5;

    const finalScore = Math.round(score);

    // Update campaign SEO score
    await pool.query(
      `UPDATE article_campaigns SET seo_score = $1 WHERE id = $2`,
      [finalScore, campaignId]
    );

    console.log(`📊 SEO Score calculated: ${finalScore}/100`);

    return finalScore;
  } catch (error) {
    console.error('❌ Error calculating SEO score:', error.message);
    return 0;
  }
};

/**
 * Get keywords with their ranking and backlink data for unified dashboard
 * @param {number} websiteId - Website ID
 * @returns {array} - Keywords with extended data
 */
const getKeywordsWithData = async (websiteId) => {
  try {
    const result = await pool.query(`
      SELECT
        k.id,
        k.keyword,
        k.source,
        k.current_position as position,
        k.search_volume,
        k.difficulty,
        k.campaign_id,
        (
          SELECT kr.current_position
          FROM keyword_rankings kr
          WHERE kr.keyword_id = k.id
          ORDER BY kr.search_date DESC
          LIMIT 1
        ) as latest_position,
        (
          SELECT kr.previous_position
          FROM keyword_rankings kr
          WHERE kr.keyword_id = k.id
          ORDER BY kr.search_date DESC
          LIMIT 1
        ) as previous_position,
        (
          SELECT COUNT(*)
          FROM backlink_keyword_matches bkm
          WHERE bkm.keyword_id = k.id
        ) as backlink_count,
        (
          SELECT COUNT(*)
          FROM generated_articles ga
          WHERE ga.website_id = k.website_id AND ga.target_keyword = k.keyword
        ) as article_count
      FROM keywords k
      WHERE k.website_id = $1
      ORDER BY k.current_position ASC NULLS LAST, k.keyword ASC
    `, [websiteId]);

    return result.rows.map(row => ({
      ...row,
      position: row.latest_position || row.position,
      change: row.previous_position && row.latest_position
        ? row.previous_position - row.latest_position
        : null,
      backlink_count: parseInt(row.backlink_count) || 0,
      article_count: parseInt(row.article_count) || 0,
    }));
  } catch (error) {
    console.error('❌ Error getting keywords with data:', error.message);
    return [];
  }
};

/**
 * Get backlinks grouped by the keywords they support
 * @param {number} websiteId - Website ID
 * @returns {object} - Grouped backlinks
 */
const getBacklinksGroupedByKeyword = async (websiteId) => {
  try {
    // Get total backlinks
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM backlinks WHERE website_id = $1 AND status = 'active'`,
      [websiteId]
    );

    // Get backlinks with keyword matches
    const matchedResult = await pool.query(`
      SELECT
        k.keyword,
        k.id as keyword_id,
        b.id as backlink_id,
        b.referring_domain,
        b.referring_url,
        b.anchor_text,
        b.domain_authority,
        b.is_dofollow,
        bkm.match_type,
        bkm.match_score
      FROM backlink_keyword_matches bkm
      JOIN keywords k ON k.id = bkm.keyword_id
      JOIN backlinks b ON b.id = bkm.backlink_id
      WHERE b.website_id = $1 AND b.status = 'active'
      ORDER BY k.keyword, bkm.match_score DESC
    `, [websiteId]);

    // Group by keyword
    const byKeyword = {};
    for (const row of matchedResult.rows) {
      if (!byKeyword[row.keyword]) {
        byKeyword[row.keyword] = {
          keyword: row.keyword,
          keyword_id: row.keyword_id,
          count: 0,
          backlinks: [],
        };
      }
      byKeyword[row.keyword].count++;
      byKeyword[row.keyword].backlinks.push({
        id: row.backlink_id,
        referring_domain: row.referring_domain,
        referring_url: row.referring_url,
        anchor_text: row.anchor_text,
        domain_authority: row.domain_authority,
        is_dofollow: row.is_dofollow,
        match_type: row.match_type,
        match_score: row.match_score,
      });
    }

    // Get count of unique backlinks with keyword matches
    const matchedCountResult = await pool.query(`
      SELECT COUNT(DISTINCT backlink_id) as matched_count
      FROM backlink_keyword_matches bkm
      JOIN backlinks b ON b.id = bkm.backlink_id
      WHERE b.website_id = $1 AND b.status = 'active'
    `, [websiteId]);

    return {
      total: parseInt(totalResult.rows[0].total) || 0,
      matchedToKeywords: parseInt(matchedCountResult.rows[0]?.matched_count) || 0,
      byKeyword: Object.values(byKeyword).sort((a, b) => b.count - a.count),
    };
  } catch (error) {
    console.error('❌ Error getting backlinks grouped by keyword:', error.message);
    return { total: 0, matchedToKeywords: 0, byKeyword: [] };
  }
};

module.exports = {
  syncCampaignKeywordsToRankings,
  matchBacklinksToKeywords,
  matchAnchorToKeyword,
  calculateCampaignSEOScore,
  getKeywordsWithData,
  getBacklinksGroupedByKeyword,
};
