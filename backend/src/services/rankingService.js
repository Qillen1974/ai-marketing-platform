const axios = require('axios');
const { pool } = require('../config/database');

const SERPER_API_URL = 'https://google.serper.dev/search';

/**
 * Check actual ranking position for a keyword using Serper API
 * @param {string} domain - Website domain (without www)
 * @param {string} keyword - Keyword to check
 * @returns {object} Ranking data with position, top results, etc.
 */
const checkKeywordRanking = async (domain, keyword) => {
  try {
    if (!process.env.SERPER_API_KEY) {
      console.warn('⚠️ Serper API key not configured, cannot check real rankings');
      return {
        position: null,
        isRanking: false,
        error: 'Serper API key not configured',
      };
    }

    console.log(`🔍 Checking real ranking for keyword: "${keyword}" on domain: ${domain}`);

    // Query Serper API for search results
    const response = await axios.post(
      SERPER_API_URL,
      {
        q: keyword,
        num: 100, // Get top 100 results
      },
      {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const organicResults = response.data.organic || [];
    console.log(`📊 Found ${organicResults.length} results for "${keyword}"`);

    // Search for the domain in results
    const domainRegex = new RegExp(domain.replace(/^www\./, ''), 'i');
    let position = null;
    let foundResult = null;

    for (let i = 0; i < organicResults.length; i++) {
      const result = organicResults[i];
      if (domainRegex.test(result.link || '')) {
        position = i + 1; // Position starts at 1, not 0
        foundResult = result;
        console.log(`✅ Found ranking at position ${position} for keyword "${keyword}"`);
        break;
      }
    }

    if (!position) {
      console.log(`❌ Domain not found in top 100 results for keyword "${keyword}"`);
    }

    // Get top 3 results for reference
    const topThree = organicResults.slice(0, 3).map((result) => ({
      position: organicResults.indexOf(result) + 1,
      title: result.title,
      link: result.link,
      snippet: result.snippet,
    }));

    return {
      position,
      isRanking: position !== null,
      foundResult,
      topThree,
      totalResults: response.data.searchParameters?.resultStats || 'Unknown',
      serpData: response.data, // Store full response for analysis
    };
  } catch (error) {
    console.error(`❌ Error checking ranking for "${keyword}":`, error.message);
    return {
      position: null,
      isRanking: false,
      error: error.message,
    };
  }
};

/**
 * Check rankings for all keywords of a website
 * @param {number} websiteId - Website ID
 * @param {string} domain - Domain to check
 * @returns {array} Array of ranking results
 */
const checkAllKeywordRankings = async (websiteId, domain) => {
  try {
    console.log(`🔗 Checking all keyword rankings for website ${websiteId}`);

    // Get all keywords for this website
    const keywordsResult = await pool.query(
      'SELECT id, keyword FROM keywords WHERE website_id = $1 ORDER BY search_volume DESC LIMIT 15',
      [websiteId]
    );

    if (keywordsResult.rows.length === 0) {
      console.log('No keywords found to check');
      return [];
    }

    console.log(`📋 Found ${keywordsResult.rows.length} keywords to check`);

    const rankings = [];

    // Check each keyword
    for (const keywordRow of keywordsResult.rows) {
      try {
        const rankingData = await checkKeywordRanking(domain, keywordRow.keyword);

        // Get previous position if it exists
        const prevRankingResult = await pool.query(
          `SELECT current_position FROM keyword_rankings
           WHERE keyword_id = $1
           ORDER BY search_date DESC
           LIMIT 1`,
          [keywordRow.id]
        );

        const previousPosition =
          prevRankingResult.rows.length > 0 ? prevRankingResult.rows[0].current_position : null;

        // Save ranking data to database
        const insertResult = await pool.query(
          `INSERT INTO keyword_rankings
           (keyword_id, website_id, current_position, previous_position, serp_data, top_3_results, is_ranking, search_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (keyword_id, search_date)
           DO UPDATE SET
             current_position = EXCLUDED.current_position,
             previous_position = EXCLUDED.previous_position,
             serp_data = EXCLUDED.serp_data,
             top_3_results = EXCLUDED.top_3_results,
             is_ranking = EXCLUDED.is_ranking
           RETURNING *`,
          [
            keywordRow.id,
            websiteId,
            rankingData.position,
            previousPosition,
            JSON.stringify(rankingData.serpData || {}),
            JSON.stringify(rankingData.topThree || []),
            rankingData.isRanking,
          ]
        );

        // Also save to ranking history for time-series data
        if (rankingData.position) {
          await pool.query(
            `INSERT INTO ranking_history
             (keyword_id, website_id, position, is_ranking, check_date)
             VALUES ($1, $2, $3, $4, NOW())`,
            [keywordRow.id, websiteId, rankingData.position, rankingData.isRanking]
          );
        }

        rankings.push({
          keywordId: keywordRow.id,
          keyword: keywordRow.keyword,
          position: rankingData.position,
          previousPosition,
          isRanking: rankingData.isRanking,
          positionChange: rankingData.position && previousPosition ? previousPosition - rankingData.position : null,
          topThree: rankingData.topThree,
          error: rankingData.error,
        });

        // Small delay to avoid API rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (keywordError) {
        console.error(`Error checking keyword ${keywordRow.keyword}:`, keywordError.message);
        rankings.push({
          keywordId: keywordRow.id,
          keyword: keywordRow.keyword,
          error: keywordError.message,
        });
      }
    }

    console.log(`✅ Completed ranking checks for ${websiteId}`);
    return rankings;
  } catch (error) {
    console.error('Error in checkAllKeywordRankings:', error);
    throw error;
  }
};

/**
 * Get ranking history for a keyword
 * @param {number} keywordId - Keyword ID
 * @param {number} days - Number of days to look back (default 30)
 * @returns {array} Historical ranking data
 */
const getRankingHistory = async (keywordId, days = 30) => {
  try {
    const result = await pool.query(
      `SELECT position, is_ranking, check_date
       FROM ranking_history
       WHERE keyword_id = $1 AND check_date >= NOW() - INTERVAL '${days} days'
       ORDER BY check_date DESC`,
      [keywordId]
    );

    return result.rows.map((row) => ({
      position: row.position,
      isRanking: row.is_ranking,
      date: row.check_date,
    }));
  } catch (error) {
    console.error('Error getting ranking history:', error);
    return [];
  }
};

/**
 * Get latest ranking data for a website
 * @param {number} websiteId - Website ID
 * @returns {array} Latest ranking data for all keywords
 */
const getLatestRankings = async (websiteId) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (kr.keyword_id)
        kr.id,
        kr.keyword_id,
        k.keyword,
        kr.current_position,
        kr.previous_position,
        kr.is_ranking,
        kr.top_3_results,
        kr.search_date,
        kr.created_at
       FROM keyword_rankings kr
       JOIN keywords k ON kr.keyword_id = k.id
       WHERE kr.website_id = $1
       ORDER BY kr.keyword_id, kr.search_date DESC`,
      [websiteId]
    );

    // Transform the results
    const rankings = result.rows.map((row) => {
      // Parse top_3_results if it's a string
      let topThree = row.top_3_results;
      if (typeof topThree === 'string') {
        try {
          topThree = JSON.parse(topThree);
        } catch (e) {
          topThree = [];
        }
      }

      return {
        keywordId: row.keyword_id,
        keyword: row.keyword,
        currentPosition: row.current_position,
        previousPosition: row.previous_position,
        isRanking: row.is_ranking,
        positionChange: row.previous_position && row.current_position ? row.previous_position - row.current_position : null,
        topThree: topThree || [],
        lastChecked: row.search_date,
      };
    });

    return rankings;
  } catch (error) {
    console.error('Error getting latest rankings:', error);
    return [];
  }
};

/**
 * Calculate ranking metrics for a website
 * @param {number} websiteId - Website ID
 * @returns {object} Ranking statistics
 */
const getRankingMetrics = async (websiteId) => {
  try {
    // Get latest rankings for each keyword
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT keyword_id) as total_keywords_tracked,
        COUNT(CASE WHEN current_position IS NOT NULL AND current_position <= 100 THEN 1 END) as keywords_ranking,
        COUNT(CASE WHEN current_position IS NOT NULL AND current_position <= 10 THEN 1 END) as top_10_keywords,
        COUNT(CASE WHEN current_position IS NOT NULL AND current_position <= 3 THEN 1 END) as top_3_keywords,
        AVG(CASE WHEN current_position IS NOT NULL THEN current_position END) as avg_position,
        MIN(CASE WHEN current_position IS NOT NULL THEN current_position END) as best_position,
        MAX(CASE WHEN current_position IS NOT NULL THEN current_position END) as worst_position,
        COUNT(CASE WHEN previous_position IS NOT NULL AND current_position IS NOT NULL AND current_position < previous_position THEN 1 END) as improved_keywords
       FROM (
         SELECT DISTINCT ON (keyword_id) *
         FROM keyword_rankings
         WHERE website_id = $1
         ORDER BY keyword_id, search_date DESC
       ) latest`,
      [websiteId]
    );

    const metrics = result.rows[0];

    return {
      totalKeywordsTracked: parseInt(metrics.total_keywords_tracked) || 0,
      keywordsRanking: parseInt(metrics.keywords_ranking) || 0,
      top10Keywords: parseInt(metrics.top_10_keywords) || 0,
      top3Keywords: parseInt(metrics.top_3_keywords) || 0,
      averagePosition: metrics.avg_position ? Math.round(metrics.avg_position * 10) / 10 : null,
      bestPosition: metrics.best_position ? parseInt(metrics.best_position) : null,
      worstPosition: metrics.worst_position ? parseInt(metrics.worst_position) : null,
      improvedKeywords: parseInt(metrics.improved_keywords) || 0,
    };
  } catch (error) {
    console.error('Error calculating ranking metrics:', error);
    return {};
  }
};

module.exports = {
  checkKeywordRanking,
  checkAllKeywordRankings,
  getRankingHistory,
  getLatestRankings,
  getRankingMetrics,
};
