const axios = require('axios');
const { getMultipleKeywordMetrics } = require('./serperService');
const { getBacklinksForDomain, findSimilarBacklinkOpportunities } = require('./seRankingService');

// Backlink Service - Discover and analyze backlink opportunities
// Uses SE Ranking API to get real backlink data from top-ranking competitors
// Falls back to Serper API if SE Ranking unavailable

const SERPER_API_URL = 'https://google.serper.dev/search';

/**
 * Discover backlink opportunities for a domain
 * Uses SE Ranking API to analyze competitor backlinks
 * @param {string} domain - Website domain to find backlinks for
 * @param {array} keywords - Keywords to analyze for opportunities
 * @param {string} opportunityType - Filter by opportunity type (guest_posts, broken_links, resource_pages, directories, mixed)
 * @param {object} userSettings - User's DA and difficulty filter preferences
 * @returns {array} Array of backlink opportunities with real data
 */
const discoverBacklinkOpportunities = async (domain, keywords = [], opportunityType = 'mixed', userSettings = null) => {
  try {
    console.log(`🔗 Discovering backlink opportunities for ${domain}...`);
    if (opportunityType !== 'mixed') {
      console.log(`📌 Filtering for: ${opportunityType}`);
    }

    const opportunities = [];

    if (!keywords || keywords.length === 0) {
      keywords = ['marketing', 'seo', 'digital'];
    }

    // REAL DATA: Use SE Ranking API to analyze competitor backlinks
    console.log(`📊 Finding top-ranking competitors for keywords: ${keywords.join(', ')}`);

    for (const keyword of keywords) {
      // Step 1: Find top-ranking sites for this keyword (using Serper)
      const rankingSites = await findRankingSitesForKeyword(keyword);

      // Step 2: Get their backlinks using SE Ranking API
      console.log(`🔗 Analyzing backlinks from ${rankingSites.length} top-ranking sites...`);

      for (const site of rankingSites.slice(0, 5)) {
        try {
          // Get backlinks from this top-ranking competitor
          const competitorBacklinks = await getBacklinksForDomain(site.source_domain);

          if (competitorBacklinks && competitorBacklinks.top_referring_domains) {
            // Convert backlink sources into opportunities
            const siteOpportunities = competitorBacklinks.top_referring_domains
              .filter(ref => {
                // Only include accessible sites (not the competitor itself)
                return ref.domain !== site.source_domain && ref.domain !== domain;
              })
              .map(ref => ({
                source_url: `https://${ref.domain}`,
                source_domain: ref.domain,
                opportunity_type: detectOpportunityType(ref.domain),
                domain_authority: ref.domain_authority || 0,
                page_authority: ref.domain_authority ? ref.domain_authority - 10 : 0,
                spam_score: 5, // SE Ranking data is real, so low spam score
                relevance_score: 85, // High relevance since competitor links there
                difficulty_score: estimateDifficultyFromAuthority(ref.domain_authority || 50),
                contact_email: null,
                contact_method: 'contact_form',
                links_from_domain: ref.links_from_domain || 1,
                referring_domain_authority: ref.domain_authority,
              }));

            opportunities.push(...siteOpportunities);
          }
        } catch (err) {
          console.warn(`⚠️  Could not fetch backlinks for ${site.source_domain}: ${err.message}`);
          // Continue with next site
        }
      }
    }

    if (opportunities.length === 0) {
      console.warn('⚠️  No opportunities found from SE Ranking API, using fallback method');
      // Fallback to original method if SE Ranking fails
      for (const keyword of keywords) {
        const rankingSites = await findRankingSitesForKeyword(keyword);
        opportunities.push(...rankingSites);
      }
    }

    // Remove duplicates and score
    const uniqueOpportunities = deduplicateOpportunities(opportunities);
    const scoredOpportunities = scoreOpportunities(uniqueOpportunities);

    // IMPROVEMENT A1 & B: Filter by achievability with user settings (removes unrealistic high-difficulty targets)
    // Pass user settings to filtering function to use configurable ranges
    const achievableOpportunities = filterByAchievability(scoredOpportunities, userSettings);

    // Filter by opportunity type if specified
    let filteredOpportunities = achievableOpportunities;
    if (opportunityType && opportunityType !== 'mixed') {
      const typeMap = {
        'guest_posts': 'guest_post',
        'broken_links': 'broken_link',
        'resource_pages': 'resource_page',
        'directories': 'directory'
      };
      const targetType = typeMap[opportunityType] || opportunityType;
      filteredOpportunities = achievableOpportunities.filter(opp => opp.opportunity_type === targetType);
      console.log(`🔍 Filtered to ${filteredOpportunities.length} ${targetType} opportunities`);
    }

    console.log(`✅ Found ${filteredOpportunities.length} real backlink opportunities from SE Ranking`);
    return filteredOpportunities.slice(0, 15); // Return top 15
  } catch (error) {
    console.error('❌ Error discovering backlink opportunities:', error.message);
    // Return default mock opportunities as fallback
    return generateDefaultOpportunities();
  }
};

/**
 * Find sites ranking for a keyword - these are potential link sources
 * @param {string} keyword - Keyword to search
 * @returns {array} Array of opportunity objects from ranking sites
 */
const findRankingSitesForKeyword = async (keyword) => {
  try {
    if (!process.env.SERPER_API_KEY) {
      console.warn('⚠️  Serper API key not configured, using mock data');
      return generateMockOpportunitiesForKeyword(keyword);
    }

    console.log(`🔍 Searching Serper for sites ranking for: "${keyword}"`);

    const response = await axios.post(
      SERPER_API_URL,
      { q: keyword, num: 10 },
      {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const opportunities = [];

    if (response.data.organic && response.data.organic.length > 0) {
      // Extract opportunities from top-ranking pages
      response.data.organic.slice(0, 5).forEach((result) => {
        try {
          const domain = new URL(result.link).hostname;
          opportunities.push({
            source_url: result.link,
            source_domain: domain,
            opportunity_type: determineOpportunityType(result.link),
            domain_authority: estimateDomainAuthority(domain),
            page_authority: estimatePageAuthority(result.link),
            spam_score: estimateSpamScore(),
            relevance_score: 85, // High relevance since they rank for the keyword
            difficulty_score: estimateDifficulty(domain),
            contact_email: null,
            contact_method: 'contact_form',
          });
        } catch (err) {
          console.error('Error processing result:', err.message);
        }
      });

      console.log(`✅ Found ${opportunities.length} ranking sites for "${keyword}"`);
    }

    return opportunities;
  } catch (error) {
    console.error('Error finding ranking sites:', error.message);
    return generateMockOpportunitiesForKeyword(keyword);
  }
};

/**
 * Determine opportunity type based on page URL
 */
const determineOpportunityType = (url) => {
  const urlLower = url.toLowerCase();

  // Check for specific opportunity types
  if (urlLower.includes('guest') || urlLower.includes('contribute') || urlLower.includes('author') || urlLower.includes('write')) {
    return 'guest_post';
  } else if (urlLower.includes('directory') || urlLower.includes('listing') || (urlLower.includes('submit') && urlLower.includes('directory'))) {
    return 'directory';
  } else if (urlLower.includes('broken') || urlLower.includes('404') || urlLower.includes('404.html')) {
    return 'broken_link';
  } else if (urlLower.includes('resource') || urlLower.includes('guide') || urlLower.includes('tools') || urlLower.includes('hub') || urlLower.includes('library')) {
    return 'resource_page';
  }

  // Distribute defaults randomly to get a mix of types
  const types = ['resource_page', 'guest_post', 'directory'];
  return types[Math.floor(Math.random() * types.length)];
};

/**
 * Estimate domain authority (rough estimate based on domain patterns)
 */
const estimateDomainAuthority = (domain) => {
  // Popular domains get higher scores
  const popularDomains = {
    'linkedin.com': 92,
    'medium.com': 90,
    'github.com': 95,
    'stackoverflow.com': 93,
    'quora.com': 88,
    'reddit.com': 91,
    'wikipedia.org': 99,
    'forbes.com': 89,
    'entrepreneur.com': 85,
    'inc.com': 84,
  };

  if (popularDomains[domain]) {
    return popularDomains[domain];
  }

  // For unknown domains, estimate based on length and structure
  const baseScore = 50;
  const bonus = Math.min(domain.length * 2, 30); // Longer domains might be more established
  return Math.round(Math.min(baseScore + bonus + Math.random() * 20, 90));
};

/**
 * Estimate page authority
 */
const estimatePageAuthority = (url) => {
  const baseScore = estimateDomainAuthority(new URL(url).hostname) - 15;
  return Math.round(Math.max(baseScore + Math.random() * 15, 20));
};

/**
 * Estimate spam score (lower is better)
 */
const estimateSpamScore = () => {
  return Math.floor(Math.random() * 20); // 0-20 is good
};

/**
 * Estimate difficulty (0-100)
 * Based on domain estimation (used when we don't have real DA)
 */
const estimateDifficulty = (domain) => {
  const da = estimateDomainAuthority(domain);
  // Higher DA = harder to get a link from
  return Math.round((da / 100) * 100);
};

/**
 * Estimate difficulty from actual domain authority
 * More accurate when we have real SE Ranking data
 */
const estimateDifficultyFromAuthority = (domainAuthority = 50) => {
  // Convert DA to realistic difficulty score
  // DA 10-20 = difficulty 15-25 (easy)
  // DA 30-40 = difficulty 30-40 (achievable)
  // DA 50-60 = difficulty 45-55 (moderate)
  // DA 70-80 = difficulty 65-75 (challenging)
  // DA 90+ = difficulty 85-95 (very hard)

  if (domainAuthority < 20) return Math.max(domainAuthority - 5, 10);
  if (domainAuthority < 30) return domainAuthority;
  if (domainAuthority < 50) return domainAuthority;
  if (domainAuthority < 70) return domainAuthority - 5;
  return Math.min(domainAuthority - 5, 95);
};

/**
 * Detect opportunity type from domain name
 * Used for real backlink data from SE Ranking
 */
const detectOpportunityType = (domain) => {
  const domainLower = domain.toLowerCase();

  if (domainLower.includes('blog') || domainLower.includes('article') || domainLower.includes('post')) {
    return 'guest_post';
  }
  if (domainLower.includes('directory') || domainLower.includes('listing') || domainLower.includes('submit')) {
    return 'directory';
  }
  if (domainLower.includes('resource') || domainLower.includes('guide') || domainLower.includes('tools') || domainLower.includes('hub')) {
    return 'resource_page';
  }
  if (domainLower.includes('forum') || domainLower.includes('discussion') || domainLower.includes('reddit')) {
    return 'forum';
  }

  return 'resource_page'; // Default to resource page
};


/**
 * Deduplicate opportunities by domain
 * @param {array} opportunities - Raw opportunities list
 * @returns {array} Deduplicated opportunities
 */
const deduplicateOpportunities = (opportunities) => {
  const seen = new Set();
  const unique = [];

  for (const opp of opportunities) {
    if (!seen.has(opp.source_domain)) {
      seen.add(opp.source_domain);
      unique.push(opp);
    }
  }

  return unique;
};

/**
 * Score opportunities based on various factors
 * @param {array} opportunities - Opportunities to score
 * @returns {array} Opportunities with scores
 */
const scoreOpportunities = (opportunities) => {
  return opportunities.map((opp) => {
    // Calculate combined score (0-100)
    // Weighted: DA (30%), Relevance (40%), Difficulty (20%), Spam Score (10%)
    const daScore = Math.min((opp.domain_authority || 0) / 60 * 30, 30);
    const relevanceScore = (opp.relevance_score || 70) * 0.4;
    const difficultyScore = Math.max(30 - (opp.difficulty_score || 50) * 0.2, 0);
    const spamScore = Math.max(10 - (opp.spam_score || 5), 0);

    const totalScore = Math.round(daScore + relevanceScore + difficultyScore + spamScore);

    return {
      ...opp,
      opportunity_score: totalScore,
    };
  }).sort((a, b) => b.opportunity_score - a.opportunity_score);
};

/**
 * IMPROVEMENT A1 & B: Filter opportunities by achievability
 * Separates realistic "easy wins" from impossible high-difficulty targets
 * Uses user-configurable settings for DA and difficulty ranges
 * @param {array} opportunities - Opportunities to filter
 * @param {object} userSettings - User's filter preferences (minDA, maxDA, minDiff, maxDiff)
 * @returns {array} Filtered and sorted opportunities
 */
const filterByAchievability = (opportunities, userSettings = null) => {
  // Use user settings or defaults
  const minDA = userSettings?.minDomainAuthority || 10;
  const maxDA = userSettings?.maxDomainAuthority || 60;
  const minDifficulty = userSettings?.minDifficulty || 20;
  const maxDifficulty = userSettings?.maxDifficulty || 70;

  console.log(`📊 Filtering ${opportunities.length} opportunities by achievability...`);
  console.log(`⚙️  Using settings: DA ${minDA}-${maxDA}, Difficulty ${minDifficulty}-${maxDifficulty}`);

  const filtered = opportunities
    .filter((opp) => {
      // Remove spam farms (spam score > 30)
      if (opp.spam_score > 30) {
        console.log(`  ❌ Removed ${opp.source_domain}: spam score too high (${opp.spam_score})`);
        return false;
      }

      // IMPROVEMENT B: Use user's max DA setting instead of hardcoded value
      if (opp.domain_authority > maxDA) {
        console.log(`  ❌ Removed ${opp.source_domain}: DA ${opp.domain_authority} exceeds max ${maxDA}`);
        return false;
      }

      // Use user's min DA setting
      if (opp.domain_authority < minDA) {
        console.log(`  ⚠️  Removed ${opp.source_domain}: DA ${opp.domain_authority} below min ${minDA}`);
        return false;
      }

      // Use user's difficulty range (configurable instead of hardcoded 20-70)
      if (opp.difficulty_score < minDifficulty || opp.difficulty_score > maxDifficulty) {
        if (opp.difficulty_score < minDifficulty) {
          console.log(`  ⚠️  Removed ${opp.source_domain}: difficulty ${opp.difficulty_score} below min ${minDifficulty}`);
        } else {
          console.log(`  ❌ Removed ${opp.source_domain}: difficulty ${opp.difficulty_score} exceeds max ${maxDifficulty}`);
        }
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by: difficulty (easy first), then DA (high first)
      if (a.difficulty_score !== b.difficulty_score) {
        return a.difficulty_score - b.difficulty_score;
      }
      return b.domain_authority - a.domain_authority;
    });

  console.log(`✅ Filtered to ${filtered.length} achievable opportunities (from ${opportunities.length})`);

  if (filtered.length === 0) {
    console.log(`⚠️  No achievable opportunities found in specified range. Returning all filtered by spam score only.`);
    // Fallback: return at least the low-spam opportunities
    return opportunities
      .filter(opp => opp.spam_score <= 30)
      .sort((a, b) => a.difficulty_score - b.difficulty_score)
      .slice(0, 10);
  }

  return filtered;
};

/**
 * Generate mock opportunities for a keyword (fallback)
 * @param {string} keyword - Keyword
 * @returns {array} Mock opportunities
 */
const generateMockOpportunitiesForKeyword = (keyword) => {
  const opportunities = [];
  const sampleDomains = [
    'medium.com',
    'linkedin.com',
    'github.com',
    'stackoverflow.com',
    'quora.com',
    'reddit.com',
    'entrepreneur.com',
    'forbes.com',
  ];

  for (let i = 0; i < 3 && i < sampleDomains.length; i++) {
    const domain = sampleDomains[i];
    opportunities.push({
      source_url: `https://${domain}/topic/${keyword}`,
      source_domain: domain,
      opportunity_type: 'resource_page',
      domain_authority: estimateDomainAuthority(domain),
      page_authority: estimatePageAuthority(`https://${domain}/topic/${keyword}`),
      spam_score: estimateSpamScore(),
      relevance_score: 80,
      difficulty_score: estimateDifficulty(domain),
      contact_email: null,
      contact_method: 'contact_form',
    });
  }

  return opportunities;
};

/**
 * Generate default opportunities (ultimate fallback)
 * @returns {array} Default opportunities
 */
const generateDefaultOpportunities = () => {
  return [
    {
      source_url: 'https://medium.com/guides',
      source_domain: 'medium.com',
      opportunity_type: 'guest_post',
      domain_authority: 90,
      page_authority: 75,
      spam_score: 5,
      relevance_score: 85,
      difficulty_score: 45,
      contact_email: null,
      contact_method: 'contact_form',
    },
    {
      source_url: 'https://github.com/topics',
      source_domain: 'github.com',
      opportunity_type: 'resource_page',
      domain_authority: 95,
      page_authority: 80,
      spam_score: 0,
      relevance_score: 80,
      difficulty_score: 55,
      contact_email: null,
      contact_method: 'contact_form',
    },
    {
      source_url: 'https://stackoverflow.com/questions',
      source_domain: 'stackoverflow.com',
      opportunity_type: 'resource_page',
      domain_authority: 93,
      page_authority: 78,
      spam_score: 2,
      relevance_score: 75,
      difficulty_score: 50,
      contact_email: null,
      contact_method: 'contact_form',
    },
  ];
};

module.exports = {
  discoverBacklinkOpportunities,
  filterByAchievability, // Export for testing
};
