const axios = require('axios');

// Serper API Service - Keyword Research
// Free tier: 100 searches/month
// Get API key at: https://serper.dev

const SERPER_API_URL = 'https://google.serper.dev/search';

/**
 * Get keyword research data from Serper API
 * @param {string} keyword - Keyword to research
 * @returns {Object} Keyword metrics (volume, difficulty, CPC, results)
 */
const getKeywordMetrics = async (keyword) => {
  try {
    if (!process.env.SERPER_API_KEY) {
      console.warn('⚠️  Serper API key not configured, using mock data');
      return getMockKeywordMetrics(keyword);
    }

    console.log(`📊 Fetching keyword metrics from Serper for: "${keyword}"`);

    const response = await axios.post(
      SERPER_API_URL,
      {
        q: keyword,
        // Note: Do NOT use type: 'news' - it returns fewer results!
        // Use default organic search to get realistic competition levels
      },
      {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ Serper API response received');

    const data = response.data;

    // Extract metrics from Serper response
    // NOTE: searchParameters.num is results PER PAGE (10-100), NOT total results!
    // Total results should be estimated from actual results returned or use approximation
    // Google doesn't expose exact total results, but we can estimate from the data
    const totalResults = data.searchResults || data.searchParameters?.totalResults || 0;

    // If we don't have a total, estimate from number of organic results * typical position
    const estimatedTotalResults = totalResults > 0
      ? totalResults
      : (data.organic ? data.organic.length * 100 : 100000); // Rough estimate

    console.log(`🔍 Serper API for "${keyword}": Got ${estimatedTotalResults} estimated results`);

    // Extract metrics from Serper response
    const metrics = {
      keyword,
      searchResults: estimatedTotalResults,
      answerBox: data.answerBox ? true : false,
      knowledge: data.knowledge ? true : false,
      ads: data.ads ? data.ads.length : 0,

      // Estimate difficulty based on number of results
      // This is a rough estimate (Serper's free tier doesn't provide difficulty directly)
      difficulty: estimateDifficulty(estimatedTotalResults),

      // Estimate search volume based on result count and authority
      // Serper doesn't provide volume directly, so we estimate
      estimatedVolume: estimateSearchVolume(estimatedTotalResults),

      // CPC is not available from free API, but we can estimate
      estimatedCPC: estimateCPC(keyword),

      topResults: data.organic ? data.organic.slice(0, 5).map(result => ({
        title: result.title,
        url: result.link,
        domain: new URL(result.link).hostname,
      })) : [],

      isReal: true,
      fetchedAt: new Date().toISOString(),
    };

    return metrics;
  } catch (error) {
    console.error('❌ Error fetching keyword metrics from Serper:', error.message);
    console.warn('⚠️  Falling back to mock data');
    return getMockKeywordMetrics(keyword);
  }
};

/**
 * Get keyword research for multiple keywords
 * @param {array} keywords - Array of keywords to research
 * @returns {array} Array of keyword metrics
 */
const getMultipleKeywordMetrics = async (keywords) => {
  try {
    if (!process.env.SERPER_API_KEY) {
      console.warn('⚠️  Serper API key not configured, using mock data');
      return keywords.map(kw => getMockKeywordMetrics(kw));
    }

    console.log(`📊 Fetching metrics for ${keywords.length} keywords...`);

    const promises = keywords.map(keyword => getKeywordMetrics(keyword));
    const results = await Promise.all(promises);

    return results;
  } catch (error) {
    console.error('❌ Error fetching multiple keywords:', error.message);
    return keywords.map(kw => getMockKeywordMetrics(kw));
  }
};

/**
 * Estimate difficulty score based on search results count
 * Rough estimation: More results = harder keyword
 * Google typically returns millions of results
 */
const estimateDifficulty = (resultCount) => {
  // Rough scale: 0-100
  if (resultCount === 0) return 0;
  if (resultCount < 100000) return 20; // Long-tail, easy
  if (resultCount < 1000000) return 40; // Medium
  if (resultCount < 10000000) return 60; // Competitive
  if (resultCount < 100000000) return 80; // Very competitive
  return 95; // Extremely competitive
};

/**
 * Estimate monthly search volume
 * Based on result count and keyword characteristics
 */
const estimateSearchVolume = (resultCount) => {
  // Very rough estimation
  // Real data would need SEMrush/Ahrefs
  if (resultCount === 0) return 0;
  if (resultCount < 100000) return Math.floor(Math.random() * 500) + 100; // 100-600
  if (resultCount < 1000000) return Math.floor(Math.random() * 5000) + 500; // 500-5500
  if (resultCount < 10000000) return Math.floor(Math.random() * 50000) + 5000; // 5k-55k
  return Math.floor(Math.random() * 100000) + 50000; // 50k-150k
};

/**
 * Estimate CPC based on keyword characteristics
 */
const estimateCPC = (keyword) => {
  // Very rough estimation based on keyword patterns
  const keywords_high_value = ['buy', 'price', 'cost', 'loan', 'insurance', 'attorney'];
  const keywords_medium_value = ['how', 'best', 'review', 'compare'];

  let baseCPC = 0.5;

  for (let kw of keywords_high_value) {
    if (keyword.toLowerCase().includes(kw)) {
      baseCPC = Math.random() * 15 + 10; // $10-25
      break;
    }
  }

  for (let kw of keywords_medium_value) {
    if (keyword.toLowerCase().includes(kw)) {
      baseCPC = Math.random() * 5 + 2; // $2-7
      break;
    }
  }

  if (baseCPC === 0.5) {
    baseCPC = Math.random() * 2 + 0.5; // $0.50-2.50
  }

  return parseFloat(baseCPC.toFixed(2));
};

/**
 * Fallback mock metrics if API is unavailable
 */
const getMockKeywordMetrics = (keyword) => {
  console.log('🎭 USING MOCK DATA (NOT from Serper API)');
  return {
    keyword,
    searchResults: Math.floor(Math.random() * 100000000) + 100000,
    answerBox: Math.random() > 0.7,
    knowledge: Math.random() > 0.6,
    ads: Math.floor(Math.random() * 4),
    difficulty: Math.floor(Math.random() * 100),
    estimatedVolume: Math.floor(Math.random() * 50000) + 100,
    estimatedCPC: (Math.random() * 20).toFixed(2),
    topResults: [
      { title: 'Mock Result 1', url: 'https://example.com/1', domain: 'example.com' },
      { title: 'Mock Result 2', url: 'https://example.com/2', domain: 'example.com' },
      { title: 'Mock Result 3', url: 'https://example.com/3', domain: 'example.com' },
    ],
    isReal: false,
    fetchedAt: new Date().toISOString(),
  };
};

module.exports = {
  getKeywordMetrics,
  getMultipleKeywordMetrics,
};
