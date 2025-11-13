const axios = require('axios');

// Backlink Monitoring Service - Verify and monitor acquired backlinks

/**
 * Verify if a backlink URL is still active and contains the expected content
 * @param {string} backlinku - The URL containing the backlink
 * @param {string} anchorText - Expected anchor text for the link
 * @param {string} targetUrl - Target URL of the backlink
 * @returns {object} Verification result
 */
const verifyBacklink = async (backlinkUrl, anchorText = null, targetUrl = null) => {
  try {
    console.log(`🔍 Verifying backlink: ${backlinkUrl}`);

    const response = await axios.get(backlinkUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const statusCode = response.status;
    const html = response.data;

    // Check if backlink exists on the page
    let isLive = false;
    let foundAnchorText = null;
    let foundUrl = null;

    if (anchorText) {
      // Look for the anchor text in the page
      if (html.includes(anchorText)) {
        isLive = true;
        foundAnchorText = anchorText;
      }
    }

    if (targetUrl && !isLive) {
      // Look for the target URL in the page
      if (html.includes(targetUrl)) {
        isLive = true;
        foundUrl = targetUrl;
      }
    }

    // If neither anchor text nor URL specified, just check if page loads
    if (!anchorText && !targetUrl && statusCode === 200) {
      isLive = true;
    }

    console.log(`✅ Verification complete - isLive: ${isLive}`);

    return {
      isLive,
      statusCode,
      foundAnchorText,
      foundUrl,
      checkedAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ Error verifying backlink: ${error.message}`);

    return {
      isLive: false,
      statusCode: null,
      error: error.message,
      checkedAt: new Date(),
    };
  }
};

/**
 * Check all backlinks for a website
 * @param {array} backlinks - Array of backlink objects to check
 * @returns {array} Array of verification results
 */
const checkAllBacklinks = async (backlinks) => {
  try {
    console.log(`🔗 Checking ${backlinks.length} backlinks...`);

    const results = [];

    for (const backlink of backlinks) {
      const result = await verifyBacklink(
        backlink.backlink_url,
        backlink.anchor_text,
        `${backlink.referring_domain}`
      );

      results.push({
        id: backlink.id,
        url: backlink.backlink_url,
        ...result,
      });

      // Add slight delay to avoid overwhelming servers
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`✅ All backlinks checked`);
    return results;
  } catch (error) {
    console.error('Error checking backlinks:', error);
    return [];
  }
};

/**
 * Estimate domain authority from backlink page
 * This is a simple estimation - in production, use Moz API or similar
 * @param {string} url - URL to estimate DA for
 * @returns {number} Estimated domain authority (0-100)
 */
const estimateBacklinkQuality = async (url) => {
  try {
    // In a real implementation, you would:
    // 1. Use Moz API for accurate DA/PA scores
    // 2. Use SEMrush API for detailed metrics
    // 3. Analyze page structure and content quality

    // For now, return a simple estimation based on domain
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Known popular domains
    const qualityEstimates = {
      'linkedin.com': 95,
      'medium.com': 90,
      'github.com': 95,
      'stackoverflow.com': 93,
      'reddit.com': 91,
      'twitter.com': 98,
      'facebook.com': 99,
      'forbes.com': 89,
      'entrepreneur.com': 85,
      'inc.com': 84,
      'techcrunch.com': 91,
      'producthunt.com': 88,
    };

    if (qualityEstimates[domain]) {
      return qualityEstimates[domain];
    }

    // Estimate based on domain length and structure
    const baseScore = 50;
    const bonus = Math.min(domain.length * 1.5, 25);
    return Math.min(Math.round(baseScore + bonus), 85);
  } catch (error) {
    console.error('Error estimating backlink quality:', error);
    return 50; // Default middle-ground estimate
  }
};

/**
 * Calculate backlink health score
 * Based on: active status, DA, relevance, recency
 * @param {object} backlink - Backlink object with verification data
 * @returns {number} Health score 0-100
 */
const calculateBacklinkHealth = (backlink) => {
  let score = 0;

  // Active status (50 points)
  if (backlink.is_active) {
    score += 50;
  } else {
    score += 0;
  }

  // Domain authority (30 points)
  const daScore = Math.min((backlink.domain_authority || 50) / 100 * 30, 30);
  score += daScore;

  // Recency (20 points) - newer backlinks worth more
  if (backlink.last_checked) {
    const daysSinceCheck = Math.floor(
      (Date.now() - new Date(backlink.last_checked).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCheck === 0) {
      score += 20; // Checked today
    } else if (daysSinceCheck <= 7) {
      score += 15; // Checked within a week
    } else if (daysSinceCheck <= 30) {
      score += 10; // Checked within a month
    } else {
      score += 5; // Checked more than a month ago
    }
  } else {
    score += 10; // Never checked, give partial credit
  }

  return Math.round(score);
};

/**
 * Get backlink health summary
 * @param {array} backlinks - Array of acquired backlinks
 * @returns {object} Health summary with stats
 */
const getBacklinkHealthSummary = (backlinks) => {
  const active = backlinks.filter((b) => b.is_active).length;
  const broken = backlinks.filter((b) => !b.is_active).length;
  const avgDA = Math.round(
    backlinks.reduce((sum, b) => sum + (b.domain_authority || 50), 0) / backlinks.length
  );

  const healthScores = backlinks.map(calculateBacklinkHealth);
  const avgHealth = Math.round(
    healthScores.reduce((a, b) => a + b, 0) / healthScores.length
  );

  return {
    totalBacklinks: backlinks.length,
    activeBacklinks: active,
    brokenBacklinks: broken,
    activePercentage: backlinks.length > 0 ? Math.round((active / backlinks.length) * 100) : 0,
    averageDomainAuthority: avgDA,
    averageHealth: avgHealth,
    healthStatus: avgHealth >= 80 ? 'Excellent' : avgHealth >= 60 ? 'Good' : 'Needs Attention',
  };
};

module.exports = {
  verifyBacklink,
  checkAllBacklinks,
  estimateBacklinkQuality,
  calculateBacklinkHealth,
  getBacklinkHealthSummary,
};
