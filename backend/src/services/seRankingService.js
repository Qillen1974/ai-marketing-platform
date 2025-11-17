const axios = require('axios');

// SE Ranking API Service
// Gets real backlink data from SE Ranking's Backlinks API
// Replaces mock/estimated data with actual research
//
// API Documentation: https://seranking.com/api/
// Authentication: Token-based (Authorization: Token {key})
//
// Supports two API key types:
// - SE_RANKING_API_KEY: Data API key (for /v1/backlinks endpoint)
// - SE_RANKING_PROJECT_API_KEY: Project API key (for /v3/backlinks endpoint)

const SE_RANKING_DATA_API_BASE = 'https://api.seranking.com/v1';
const SE_RANKING_PROJECT_API_BASE = 'https://api.seranking.com/v3';

/**
 * Get backlinks for a domain from SE Ranking API
 * @param {string} domain - Domain to analyze (e.g., "example.com")
 * @returns {object} Backlink summary with metrics
 */
const getBacklinksForDomain = async (domain) => {
  try {
    // Try Project API key first (recommended), fall back to Data API key
    const apiKey = process.env.SE_RANKING_PROJECT_API_KEY || process.env.SE_RANKING_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  SE Ranking API key not configured (need SE_RANKING_PROJECT_API_KEY or SE_RANKING_API_KEY)');
      return null;
    }

    const keyMasked = apiKey ?
      `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 5)}` :
      'NOT SET';

    // Determine which API endpoint to use based on key type
    const isProjectKey = !!process.env.SE_RANKING_PROJECT_API_KEY;
    const apiBase = isProjectKey ? SE_RANKING_PROJECT_API_BASE : SE_RANKING_DATA_API_BASE;
    const keyType = isProjectKey ? 'Project' : 'Data';

    console.log(`🔍 Fetching backlinks from SE Ranking for: ${domain} (${keyType} API, key: ${keyMasked})`);

    // SE Ranking API uses "Token" authentication format (from their documentation)
    // https://seranking.com/api/
    const response = await axios.get(`${apiBase}/backlinks`, {
      params: {
        target: domain,
        limit: 100, // Get top 100 backlinks for analysis
      },
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    if (!response.data || !response.data.backlinks) {
      console.log(`⚠️  No backlink data returned for ${domain}`);
      return null;
    }

    // Process backlinks to calculate metrics
    const backlinks = response.data.backlinks || [];
    const backlinksData = {
      domain,
      total_backlinks: response.data.total_backlinks || backlinks.length,
      referring_domains: response.data.referring_domains || getUniqueReferringDomains(backlinks),
      dofollow_backlinks: backlinks.filter(b => b.dofollow).length,
      nofollow_backlinks: backlinks.filter(b => !b.dofollow).length,
      avg_domain_authority: calculateAverageDomainAuthority(backlinks),
      referring_ips: response.data.referring_ips || getUniqueIPs(backlinks),
      top_referring_domains: getTopReferringDomains(backlinks, 10),
      anchor_texts: getTopAnchorTexts(backlinks, 10),
      link_types: categorizeLinkTypes(backlinks),
      opportunity_potential: calculateOpportunityPotential(backlinks),
    };

    console.log(`✅ Retrieved backlink data for ${domain}: ${backlinksData.total_backlinks} backlinks`);
    return backlinksData;
  } catch (error) {
    // Better error logging for debugging
    if (error.response) {
      console.error(`❌ Error fetching backlinks for ${domain}:`, `Status ${error.response.status}`, error.response.data?.error || error.message);
    } else {
      console.error(`❌ Error fetching backlinks for ${domain}:`, error.message);
    }
    return null;
  }
};

/**
 * Find similar backlink opportunities from a competitor
 * Returns domains that link to competitor but not to user's site
 * @param {string} userDomain - User's domain
 * @param {string} competitorDomain - Competitor domain
 * @returns {array} List of opportunity domains
 */
const findSimilarBacklinkOpportunities = async (userDomain, competitorDomain) => {
  try {
    if (!process.env.SE_RANKING_API_KEY) {
      console.warn('⚠️  SE Ranking API key not configured');
      return [];
    }

    console.log(`🔗 Finding backlink opportunities by comparing ${competitorDomain} vs ${userDomain}`);

    // Get backlinks for competitor
    const competitorBacklinks = await getBacklinksForDomain(competitorDomain);
    if (!competitorBacklinks) {
      console.log(`⚠️  Could not fetch competitor backlinks`);
      return [];
    }

    // Get backlinks for user domain
    const userBacklinks = await getBacklinksForDomain(userDomain);
    const userReferringDomains = userBacklinks
      ? new Set(userBacklinks.top_referring_domains.map(d => d.domain))
      : new Set();

    // Find domains linking to competitor but not user
    const opportunities = competitorBacklinks.top_referring_domains
      .filter(ref => !userReferringDomains.has(ref.domain))
      .map(ref => ({
        domain: ref.domain,
        url: ref.url,
        domain_authority: ref.domain_authority || 0,
        links_from_domain: ref.links_count || 1,
        anchor_texts: getAnchorTextsForDomain(competitorBacklinks.anchor_texts, ref.domain),
        opportunity_type: detectOpportunityType(ref),
        difficulty: estimateDifficultyFromAuthority(ref.domain_authority || 50),
      }))
      .sort((a, b) => b.domain_authority - a.domain_authority);

    console.log(`✅ Found ${opportunities.length} similar backlink opportunities`);
    return opportunities;
  } catch (error) {
    console.error('❌ Error finding similar opportunities:', error.message);
    return [];
  }
};

/**
 * Get backlink opportunities for specific keywords
 * Finds top ranking sites and analyzes their backlinks
 * @param {string} keyword - Keyword to analyze
 * @param {number} topSites - Number of top ranking sites to analyze (default: 20)
 * @returns {array} List of backlink opportunity objects
 */
const findBacklinkOpportunitiesByKeyword = async (keyword, topSites = 20) => {
  try {
    if (!process.env.SE_RANKING_API_KEY) {
      console.warn('⚠️  SE Ranking API key not configured');
      return [];
    }

    console.log(`🔗 Finding backlink opportunities for keyword: "${keyword}"`);

    // This would require SERP data, which we get from Serper
    // This function is a placeholder for integration with Serper results
    const opportunities = [];

    console.log(`✅ Found ${opportunities.length} backlink opportunities for "${keyword}"`);
    return opportunities;
  } catch (error) {
    console.error('❌ Error finding keyword opportunities:', error.message);
    return [];
  }
};

/**
 * Calculate domain authority from backlink profile
 * SE Ranking returns domain metrics, we can estimate quality
 */
const calculateAverageDomainAuthority = (backlinks) => {
  if (!backlinks || backlinks.length === 0) return 0;

  const sum = backlinks.reduce((acc, b) => acc + (b.domain_authority || 0), 0);
  return Math.round(sum / backlinks.length);
};

/**
 * Get unique referring domains from backlinks
 */
const getUniqueReferringDomains = (backlinks) => {
  const domains = new Set();
  backlinks.forEach(b => {
    if (b.referring_domain) {
      domains.add(b.referring_domain);
    }
  });
  return domains.size;
};

/**
 * Get unique IPs from backlinks
 */
const getUniqueIPs = (backlinks) => {
  const ips = new Set();
  backlinks.forEach(b => {
    if (b.ip) {
      ips.add(b.ip);
    }
  });
  return ips.size;
};

/**
 * Get top referring domains with their metrics
 */
const getTopReferringDomains = (backlinks, limit = 10) => {
  const domainMap = {};

  backlinks.forEach(b => {
    const domain = b.referring_domain || b.url;
    if (!domainMap[domain]) {
      domainMap[domain] = {
        domain,
        url: b.url,
        links_count: 0,
        domain_authority: b.domain_authority || 0,
        dofollow_count: 0,
        nofollow_count: 0,
      };
    }
    domainMap[domain].links_count++;
    if (b.dofollow) {
      domainMap[domain].dofollow_count++;
    } else {
      domainMap[domain].nofollow_count++;
    }
  });

  return Object.values(domainMap)
    .sort((a, b) => b.links_count - a.links_count)
    .slice(0, limit);
};

/**
 * Get top anchor texts with their frequency
 */
const getTopAnchorTexts = (backlinks, limit = 10) => {
  const anchorMap = {};

  backlinks.forEach(b => {
    const anchor = b.anchor_text || 'No anchor';
    if (!anchorMap[anchor]) {
      anchorMap[anchor] = { text: anchor, count: 0 };
    }
    anchorMap[anchor].count++;
  });

  return Object.values(anchorMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Get anchor texts for a specific domain
 */
const getAnchorTextsForDomain = (allAnchorTexts, domain) => {
  // This is simplified - would need to track anchors per domain in SE Ranking response
  return allAnchorTexts.slice(0, 3).map(a => a.text);
};

/**
 * Categorize link types (direct, redirect, image, etc.)
 */
const categorizeLinkTypes = (backlinks) => {
  const types = {
    direct: 0,
    image: 0,
    redirect: 0,
    text: 0,
  };

  backlinks.forEach(b => {
    if (b.link_type === 'image') types.image++;
    else if (b.link_type === 'redirect') types.redirect++;
    else if (b.is_image_link) types.image++;
    else types.text++;
  });

  return types;
};

/**
 * Calculate opportunity potential based on backlink profile
 * Higher potential = more likely to be worth pursuing
 */
const calculateOpportunityPotential = (backlinks) => {
  if (!backlinks || backlinks.length === 0) return 0;

  let potential = 0;

  // More backlinks = higher potential
  potential += Math.min(backlinks.length / 10, 20);

  // More dofollow links = higher potential
  const dofollowCount = backlinks.filter(b => b.dofollow).length;
  potential += Math.min((dofollowCount / backlinks.length) * 30, 30);

  // Higher average domain authority = higher potential
  const avgDA = calculateAverageDomainAuthority(backlinks);
  potential += Math.min((avgDA / 100) * 30, 30);

  // Variety of anchor texts = higher potential
  const uniqueAnchors = new Set(backlinks.map(b => b.anchor_text || ''));
  potential += Math.min((uniqueAnchors.size / backlinks.length) * 20, 20);

  return Math.round(Math.min(potential, 100));
};

/**
 * Detect opportunity type from backlink characteristics
 */
const detectOpportunityType = (referringDomain) => {
  const domain = referringDomain.domain || '';
  const domainLower = domain.toLowerCase();

  if (domainLower.includes('blog') || domainLower.includes('article')) {
    return 'guest_post';
  }
  if (domainLower.includes('directory') || domainLower.includes('listing')) {
    return 'directory';
  }
  if (domainLower.includes('resource') || domainLower.includes('guide')) {
    return 'resource_page';
  }
  if (domainLower.includes('forum') || domainLower.includes('discussion')) {
    return 'forum';
  }

  return 'other';
};

/**
 * Estimate difficulty from domain authority
 * More accurate than mock estimation
 */
const estimateDifficultyFromAuthority = (domainAuthority = 50) => {
  // Convert DA to difficulty score
  // DA 10-20 = difficulty 15-25
  // DA 30-40 = difficulty 30-40
  // DA 50-60 = difficulty 45-55
  // DA 70-80 = difficulty 65-75
  // DA 90+ = difficulty 85-95

  if (domainAuthority < 20) return Math.max(domainAuthority - 5, 10);
  if (domainAuthority < 30) return domainAuthority;
  if (domainAuthority < 50) return domainAuthority;
  if (domainAuthority < 70) return domainAuthority - 5;
  return Math.min(domainAuthority - 5, 95);
};

module.exports = {
  getBacklinksForDomain,
  findSimilarBacklinkOpportunities,
  findBacklinkOpportunitiesByKeyword,
  calculateOpportunityPotential,
};
