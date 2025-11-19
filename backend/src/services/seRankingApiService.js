const axios = require('axios');

// SE Ranking API Service
// Provides access to domain analysis, website audit, and backlinks data
// Documentation: https://seranking.com/api/

const SE_RANKING_API_BASE = 'https://api.seranking.com/v4';

// Initialize axios instance with SE Ranking API
const seRankingClient = axios.create({
  baseURL: SE_RANKING_API_BASE,
  timeout: 30000,
  headers: {
    'Authorization': `Token ${process.env.SE_RANKING_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// ============================================
// DOMAIN ANALYSIS API
// ============================================

/**
 * Get domain overview (keywords, traffic, rankings)
 * @param {string} domain - Domain to analyze
 * @param {string} countryCode - Country code (e.g., 'US', 'GB')
 * @returns {object} Domain overview data
 */
const getDomainOverview = async (domain, countryCode = 'US') => {
  try {
    console.log(`🔍 Fetching domain overview for ${domain} (${countryCode})`);

    const response = await seRankingClient.get('/domain/overview', {
      params: {
        domain,
        countryCode,
      },
    });

    console.log(`✅ Domain overview retrieved for ${domain}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching domain overview for ${domain}:`, error.message);
    if (error.response?.status === 404) {
      console.log(`⚠️ Domain not found in SE Ranking database: ${domain}`);
    }
    return null;
  }
};

/**
 * Get ranking keywords for a domain
 * @param {string} domain - Domain to analyze
 * @param {string} countryCode - Country code
 * @param {number} limit - Number of results (default 100, max 500)
 * @returns {array} Array of ranking keywords
 */
const getDomainKeywords = async (domain, countryCode = 'US', limit = 100) => {
  try {
    console.log(`🔑 Fetching keywords for ${domain} (${countryCode})`);

    const response = await seRankingClient.get('/domain/keywords', {
      params: {
        domain,
        countryCode,
        limit: Math.min(limit, 500),
      },
    });

    console.log(`✅ Found ${response.data.keywords?.length || 0} ranking keywords for ${domain}`);
    return response.data.keywords || [];
  } catch (error) {
    console.error(`❌ Error fetching keywords for ${domain}:`, error.message);
    return [];
  }
};

/**
 * Get backlinks for a domain
 * @param {string} domain - Domain to analyze
 * @param {object} filters - Filter options (limit, offset, etc.)
 * @returns {object} Backlinks data
 */
const getDomainBacklinks = async (domain, filters = {}) => {
  try {
    console.log(`🔗 Fetching backlinks for ${domain}`);

    const response = await seRankingClient.get('/backlinks/summary', {
      params: {
        domain,
        ...filters,
      },
    });

    console.log(`✅ Backlinks summary retrieved for ${domain}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching backlinks for ${domain}:`, error.message);
    return null;
  }
};

/**
 * Get detailed backlinks for a domain
 * @param {string} domain - Domain to analyze
 * @param {number} limit - Number of backlinks to return
 * @param {number} offset - Pagination offset
 * @returns {array} Array of backlink objects
 */
const getDetailedBacklinks = async (domain, limit = 50, offset = 0) => {
  try {
    console.log(`🔗 Fetching detailed backlinks for ${domain} (limit: ${limit}, offset: ${offset})`);

    const response = await seRankingClient.get('/backlinks/list', {
      params: {
        domain,
        limit: Math.min(limit, 500),
        offset,
      },
    });

    console.log(`✅ Retrieved ${response.data.backlinks?.length || 0} backlinks for ${domain}`);
    return response.data.backlinks || [];
  } catch (error) {
    console.error(`❌ Error fetching detailed backlinks for ${domain}:`, error.message);
    return [];
  }
};

/**
 * Compare two domains (keywords, rankings, traffic)
 * @param {string} domain1 - First domain
 * @param {string} domain2 - Second domain to compare
 * @param {string} countryCode - Country code
 * @returns {object} Comparison data
 */
const compareDomains = async (domain1, domain2, countryCode = 'US') => {
  try {
    console.log(`⚖️ Comparing ${domain1} vs ${domain2}`);

    const [keywords1, keywords2] = await Promise.all([
      getDomainKeywords(domain1, countryCode, 500),
      getDomainKeywords(domain2, countryCode, 500),
    ]);

    if (!keywords1 || !keywords2) {
      console.log('⚠️ Unable to compare - one or both domains not found');
      return null;
    }

    // Find common keywords
    const keywords1Set = new Set(keywords1.map(k => k.keyword.toLowerCase()));
    const keywords2Set = new Set(keywords2.map(k => k.keyword.toLowerCase()));

    const commonKeywords = Array.from(keywords1Set).filter(k => keywords2Set.has(k));
    const uniqueTo1 = keywords1.filter(k => !keywords2Set.has(k.keyword.toLowerCase()));
    const uniqueTo2 = keywords2.filter(k => !keywords1Set.has(k.keyword.toLowerCase()));

    return {
      domain1,
      domain2,
      domain1KeywordsCount: keywords1.length,
      domain2KeywordsCount: keywords2.length,
      commonKeywordsCount: commonKeywords.length,
      commonKeywords,
      uniqueTo1: uniqueTo1.slice(0, 50),
      uniqueTo2: uniqueTo2.slice(0, 50),
      trafficGap: {
        domain1: keywords1.reduce((sum, k) => sum + (k.trafficEstimate || 0), 0),
        domain2: keywords2.reduce((sum, k) => sum + (k.trafficEstimate || 0), 0),
      },
    };
  } catch (error) {
    console.error(`❌ Error comparing domains:`, error.message);
    return null;
  }
};

// ============================================
// WEBSITE AUDIT API
// ============================================

/**
 * Start a website audit crawl
 * @param {string} domain - Domain to audit
 * @param {object} options - Audit options
 * @returns {object} Audit job information
 */
const startWebsiteAudit = async (domain, options = {}) => {
  try {
    console.log(`🔧 Starting website audit for ${domain}`);

    const response = await seRankingClient.post('/audit/start', {
      domain,
      crawlStandard: options.crawlStandard !== false, // Default true
      crawlJavaScript: options.crawlJavaScript || false, // For SPAs
      ignoreRobotsTxt: options.ignoreRobotsTxt || false,
      ...options,
    });

    console.log(`✅ Audit started for ${domain}, job ID: ${response.data.jobId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error starting audit for ${domain}:`, error.message);
    return null;
  }
};

/**
 * Get audit progress/status
 * @param {string} domain - Domain being audited
 * @param {string} jobId - Job ID from startWebsiteAudit
 * @returns {object} Audit status
 */
const getAuditStatus = async (domain, jobId) => {
  try {
    const response = await seRankingClient.get('/audit/progress', {
      params: {
        domain,
        jobId,
      },
    });

    console.log(`📊 Audit status for ${domain}: ${response.data.status}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error getting audit status:`, error.message);
    return null;
  }
};

/**
 * Get audit report (issues, statistics)
 * @param {string} domain - Domain audited
 * @returns {object} Complete audit report
 */
const getAuditReport = async (domain) => {
  try {
    console.log(`📋 Fetching audit report for ${domain}`);

    const response = await seRankingClient.get('/audit/report', {
      params: {
        domain,
      },
    });

    console.log(`✅ Audit report retrieved for ${domain}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching audit report for ${domain}:`, error.message);
    return null;
  }
};

/**
 * Get audit issues for a specific URL
 * @param {string} domain - Domain
 * @param {string} url - Specific URL to check
 * @returns {array} Array of issues found on page
 */
const getPageIssues = async (domain, url) => {
  try {
    console.log(`🔍 Fetching issues for ${url}`);

    const response = await seRankingClient.get('/audit/page-issues', {
      params: {
        domain,
        url,
      },
    });

    return response.data.issues || [];
  } catch (error) {
    console.error(`❌ Error fetching page issues:`, error.message);
    return [];
  }
};

/**
 * Get all audited URLs from an audit
 * @param {string} domain - Domain audited
 * @param {number} limit - Number of results
 * @param {number} offset - Pagination offset
 * @returns {array} Array of audited URLs
 */
const getAuditedUrls = async (domain, limit = 100, offset = 0) => {
  try {
    console.log(`📑 Fetching audited URLs for ${domain}`);

    const response = await seRankingClient.get('/audit/urls', {
      params: {
        domain,
        limit: Math.min(limit, 500),
        offset,
      },
    });

    return response.data.urls || [];
  } catch (error) {
    console.error(`❌ Error fetching audited URLs:`, error.message);
    return [];
  }
};

// ============================================
// BACKLINKS API
// ============================================

/**
 * Get backlink summary statistics
 * @param {string} domain - Domain to analyze
 * @returns {object} Backlink statistics
 */
const getBacklinkStats = async (domain) => {
  try {
    console.log(`📊 Fetching backlink statistics for ${domain}`);

    const response = await seRankingClient.get('/backlinks/summary', {
      params: {
        domain,
      },
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching backlink stats:`, error.message);
    return null;
  }
};

/**
 * Get top referring domains
 * @param {string} domain - Domain to analyze
 * @param {number} limit - Number to return
 * @returns {array} Top referring domains
 */
const getTopReferringDomains = async (domain, limit = 50) => {
  try {
    console.log(`🔝 Fetching top referring domains for ${domain}`);

    const response = await seRankingClient.get('/backlinks/top-referring-domains', {
      params: {
        domain,
        limit: Math.min(limit, 500),
      },
    });

    return response.data.domains || [];
  } catch (error) {
    console.error(`❌ Error fetching top referring domains:`, error.message);
    return [];
  }
};

/**
 * Get anchor text analysis
 * @param {string} domain - Domain to analyze
 * @param {number} limit - Number of anchor texts
 * @returns {array} Anchor text list with counts
 */
const getAnchorTexts = async (domain, limit = 50) => {
  try {
    console.log(`🏷️ Fetching anchor texts for ${domain}`);

    const response = await seRankingClient.get('/backlinks/anchor-texts', {
      params: {
        domain,
        limit: Math.min(limit, 500),
      },
    });

    return response.data.anchors || [];
  } catch (error) {
    console.error(`❌ Error fetching anchor texts:`, error.message);
    return [];
  }
};

/**
 * Get new and lost backlinks
 * @param {string} domain - Domain to analyze
 * @param {string} type - 'new' or 'lost'
 * @param {number} limit - Number to return
 * @returns {array} New or lost backlinks
 */
const getBacklinksHistory = async (domain, type = 'new', limit = 50) => {
  try {
    console.log(`📈 Fetching ${type} backlinks for ${domain}`);

    const response = await seRankingClient.get(`/backlinks/${type}`, {
      params: {
        domain,
        limit: Math.min(limit, 500),
      },
    });

    return response.data.backlinks || [];
  } catch (error) {
    console.error(`❌ Error fetching ${type} backlinks:`, error.message);
    return [];
  }
};

/**
 * Get backlinks for a specific page
 * @param {string} domain - Domain
 * @param {string} page - Page path (e.g., '/about')
 * @returns {array} Backlinks to that page
 */
const getPageBacklinks = async (domain, page) => {
  try {
    console.log(`🔗 Fetching backlinks for page: ${domain}${page}`);

    const response = await seRankingClient.get('/backlinks/page-backlinks', {
      params: {
        domain,
        page,
      },
    });

    return response.data.backlinks || [];
  } catch (error) {
    console.error(`❌ Error fetching page backlinks:`, error.message);
    return [];
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate traffic estimate for keywords
 * @param {array} keywords - Array of keyword objects with position
 * @returns {number} Estimated total traffic
 */
const calculateTrafficEstimate = (keywords = []) => {
  return keywords.reduce((total, keyword) => {
    return total + (keyword.trafficEstimate || 0);
  }, 0);
};

/**
 * Classify backlink quality
 * @param {object} backlink - Backlink object
 * @returns {string} Quality level: 'excellent', 'good', 'average', 'poor'
 */
const classifyBacklinkQuality = (backlink) => {
  // This would use InLink Rank and domain authority if available
  const score = (backlink.inlinkRank || 0) + (backlink.domainAuthority || 0);

  if (score >= 150) return 'excellent';
  if (score >= 100) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
};

/**
 * Analyze audit issues and prioritize by impact
 * @param {array} issues - Array of audit issues
 * @returns {array} Issues sorted by priority
 */
const prioritizeIssues = (issues = []) => {
  const priorityMap = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return issues.sort((a, b) => {
    return (priorityMap[b.severity] || 0) - (priorityMap[a.severity] || 0);
  });
};

// ============================================
// ERROR HANDLING & VALIDATION
// ============================================

/**
 * Validate domain format
 * @param {string} domain - Domain to validate
 * @returns {boolean} True if valid domain format
 */
const isValidDomain = (domain) => {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return domainRegex.test(domain);
};

/**
 * Check if SE Ranking API credentials are configured
 * @returns {boolean} True if credentials exist
 */
const isConfigured = () => {
  return !!process.env.SE_RANKING_API_KEY;
};

/**
 * Log API usage for quota tracking
 * @param {string} endpoint - API endpoint used
 * @param {number} cost - API credits used
 */
const logApiUsage = (endpoint, cost = 1) => {
  console.log(`📊 SE Ranking API used: ${endpoint} (cost: ${cost} credits)`);
  // Could be extended to store in database for quota tracking
};

module.exports = {
  // Domain Analysis
  getDomainOverview,
  getDomainKeywords,
  getDomainBacklinks,
  getDetailedBacklinks,
  compareDomains,

  // Website Audit
  startWebsiteAudit,
  getAuditStatus,
  getAuditReport,
  getPageIssues,
  getAuditedUrls,

  // Backlinks
  getBacklinkStats,
  getTopReferringDomains,
  getAnchorTexts,
  getBacklinksHistory,
  getPageBacklinks,

  // Helpers
  calculateTrafficEstimate,
  classifyBacklinkQuality,
  prioritizeIssues,
  isValidDomain,
  isConfigured,
  logApiUsage,
};
