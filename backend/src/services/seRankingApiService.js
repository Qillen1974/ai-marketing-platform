const axios = require('axios');

// SE Ranking API Service
// Provides access to domain analysis, website audit, and backlinks data
// Documentation: https://seranking.com/api/data/getting-started/

const SE_RANKING_API_BASE = 'https://api.seranking.com';

// Debug: Check if SE_RANKING_API_KEY is configured
console.log('🔑 SE_RANKING_API_KEY:', process.env.SE_RANKING_API_KEY ? `Set (${process.env.SE_RANKING_API_KEY.substring(0, 8)}...)` : 'NOT SET');
if (process.env.SE_RANKING_API_KEY) {
  console.log('✅ SE_RANKING_API_KEY is configured');
} else {
  console.error('❌ SE_RANKING_API_KEY is NOT configured. Set this environment variable.');
}

// Initialize axios instance with SE Ranking API
const seRankingClient = axios.create({
  baseURL: SE_RANKING_API_BASE,
  timeout: 60000, // Increased timeout for large requests
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
 * Get backlinks summary for a domain
 * POST /v1/backlinks/summary
 * @param {string} domain - Domain to analyze
 * @param {object} filters - Filter options (mode, etc.)
 * @returns {object} Backlinks summary data
 */
const getDomainBacklinks = async (domain, filters = {}) => {
  try {
    console.log(`🔗 Fetching backlinks summary for ${domain}`);

    const response = await seRankingClient.post('/v1/backlinks/summary', {
      target: domain,
      mode: filters.mode || 'domain',
    });

    console.log(`✅ Backlinks summary retrieved for ${domain}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching backlinks for ${domain}:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data));
    }
    return null;
  }
};

/**
 * Get detailed backlinks for a domain
 * GET /v1/backlinks/raw
 * @param {string} domain - Domain to analyze
 * @param {number} limit - Number of backlinks to return (max 50000)
 * @param {number} offset - Not used (API uses 'next' token for pagination)
 * @returns {object} Object with backlinks array
 */
const getDetailedBacklinks = async (domain, limit = 500, offset = 0) => {
  try {
    console.log(`🔗 Fetching detailed backlinks for ${domain} (limit: ${limit})`);

    const response = await seRankingClient.get('/v1/backlinks/raw', {
      params: {
        target: domain,
        mode: 'domain',
        limit: Math.min(limit, 50000),
        output: 'json',
      },
    });

    const backlinks = response.data?.backlinks || response.data || [];
    console.log(`✅ Retrieved ${Array.isArray(backlinks) ? backlinks.length : 0} backlinks for ${domain}`);

    return { backlinks: Array.isArray(backlinks) ? backlinks : [] };
  } catch (error) {
    console.error(`❌ Error fetching detailed backlinks for ${domain}:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data));
    }
    return { backlinks: [] };
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
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
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
// BACKLINKS API (v1)
// Documentation: https://seranking.com/api/data/backlinks/
// ============================================

/**
 * Get backlink summary statistics
 * POST /v1/backlinks/summary
 * @param {string} domain - Domain to analyze
 * @param {string} mode - 'domain', 'host', or 'url' (default: 'domain')
 * @returns {object} Backlink statistics
 */
const getBacklinkStats = async (domain, mode = 'domain') => {
  try {
    console.log(`📊 Fetching backlink statistics for ${domain} (mode: ${mode})`);

    const response = await seRankingClient.post('/v1/backlinks/summary', {
      target: domain,
      mode: mode,
    });

    console.log(`✅ Backlink stats retrieved for ${domain}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching backlink stats:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data));
    }
    return null;
  }
};

/**
 * Get top referring domains
 * GET /v1/backlinks/referring-domains
 * @param {string} domain - Domain to analyze
 * @param {number} limit - Number to return (max 50000)
 * @returns {object} Object with domains array
 */
const getTopReferringDomains = async (domain, limit = 100) => {
  try {
    console.log(`🔝 Fetching top referring domains for ${domain}`);

    const response = await seRankingClient.get('/v1/backlinks/referring-domains', {
      params: {
        target: domain,
        mode: 'domain',
        limit: Math.min(limit, 50000),
        output: 'json',
      },
    });

    const domains = response.data?.referring_domains || response.data?.domains || response.data || [];
    console.log(`✅ Retrieved ${Array.isArray(domains) ? domains.length : 0} referring domains for ${domain}`);

    return { domains: Array.isArray(domains) ? domains : [] };
  } catch (error) {
    console.error(`❌ Error fetching top referring domains:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data));
    }
    // Fallback: try to get from summary
    try {
      const summary = await getBacklinkStats(domain);
      if (summary?.top_referring_domains) {
        return { domains: summary.top_referring_domains };
      }
    } catch (e) {
      // Ignore fallback error
    }
    return { domains: [] };
  }
};

/**
 * Get anchor text analysis
 * GET /v1/backlinks/anchors
 * @param {string} domain - Domain to analyze
 * @param {number} limit - Number of anchor texts
 * @returns {object} Object with anchorTexts array
 */
const getAnchorTexts = async (domain, limit = 100) => {
  try {
    console.log(`🏷️ Fetching anchor texts for ${domain}`);

    const response = await seRankingClient.get('/v1/backlinks/anchors', {
      params: {
        target: domain,
        mode: 'domain',
        limit: Math.min(limit, 50000),
        output: 'json',
      },
    });

    const anchors = response.data?.anchors || response.data?.anchor_texts || response.data || [];
    console.log(`✅ Retrieved ${Array.isArray(anchors) ? anchors.length : 0} anchor texts for ${domain}`);

    return { anchorTexts: Array.isArray(anchors) ? anchors : [] };
  } catch (error) {
    console.error(`❌ Error fetching anchor texts:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data));
    }
    // Fallback: try to get from summary
    try {
      const summary = await getBacklinkStats(domain);
      if (summary?.top_anchors) {
        return { anchorTexts: summary.top_anchors };
      }
    } catch (e) {
      // Ignore fallback error
    }
    return { anchorTexts: [] };
  }
};

/**
 * Get new and lost backlinks
 * GET /v1/backlinks/new-lost-backlinks
 * @param {string} domain - Domain to analyze
 * @param {string} type - 'new' or 'lost'
 * @param {number} limit - Number to return
 * @returns {array} New or lost backlinks
 */
const getBacklinksHistory = async (domain, type = 'new', limit = 100) => {
  try {
    console.log(`📈 Fetching ${type} backlinks for ${domain}`);

    const response = await seRankingClient.get('/v1/backlinks/new-lost-backlinks', {
      params: {
        target: domain,
        mode: 'domain',
        type: type, // 'new' or 'lost'
        limit: Math.min(limit, 50000),
        output: 'json',
      },
    });

    const backlinks = response.data?.backlinks || response.data || [];
    console.log(`✅ Retrieved ${Array.isArray(backlinks) ? backlinks.length : 0} ${type} backlinks for ${domain}`);

    return Array.isArray(backlinks) ? backlinks : [];
  } catch (error) {
    console.error(`❌ Error fetching ${type} backlinks:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
    return [];
  }
};

/**
 * Get backlinks for a specific URL
 * GET /v1/backlinks/raw with mode='url'
 * @param {string} domain - Domain
 * @param {string} page - Page path (e.g., '/about')
 * @returns {array} Backlinks to that page
 */
const getPageBacklinks = async (domain, page) => {
  try {
    const fullUrl = page.startsWith('http') ? page : `https://${domain}${page}`;
    console.log(`🔗 Fetching backlinks for page: ${fullUrl}`);

    const response = await seRankingClient.get('/v1/backlinks/raw', {
      params: {
        target: fullUrl,
        mode: 'url',
        limit: 1000,
        output: 'json',
      },
    });

    const backlinks = response.data?.backlinks || response.data || [];
    return Array.isArray(backlinks) ? backlinks : [];
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
