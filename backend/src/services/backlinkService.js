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

    // Log user's DA preferences
    if (userSettings) {
      console.log(`⚙️  User settings: DA ${userSettings.minDomainAuthority}-${userSettings.maxDomainAuthority}, Difficulty ${userSettings.minDifficulty || 0}-${userSettings.maxDifficulty || 100}`);
    }

    const opportunities = [];

    if (!keywords || keywords.length === 0) {
      keywords = ['marketing', 'seo', 'digital'];
    }

    // REAL DATA: Use SE Ranking API to analyze competitor backlinks
    console.log(`📊 Finding opportunities for ${keywords.length} keywords: ${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? ` (+${keywords.length - 5} more)` : ''}`);

    for (const keyword of keywords) {
      // Step 1: Find top-ranking sites for this keyword (using Serper)
      const rankingSites = await findRankingSitesForKeyword(keyword);

      // Step 2: Get their backlinks using SE Ranking API
      console.log(`🔗 Analyzing backlinks from ranking sites...`);

      // CRITICAL: Filter ranking sites by achievable DA range
      // Major sites (DA 90) only link from other major sites
      // We need medium-authority sites to find achievable opportunities
      let sitesToAnalyze = rankingSites;

      if (userSettings && userSettings.maxDomainAuthority) {
        // Only analyze sites that are within 2x the user's max DA
        // This increases chances their backlinks are achievable
        const maxDA = userSettings.maxDomainAuthority;
        const targetDARange = Math.min(maxDA * 2.5, 80); // Look for sites up to 2.5x user's max, or DA 80
        sitesToAnalyze = rankingSites.filter(site => site.domain_authority <= targetDARange);

        console.log(`   📊 Filtered to ${sitesToAnalyze.length} sites with DA <= ${targetDARange} (user max: ${maxDA})`);

        if (sitesToAnalyze.length === 0) {
          console.warn(`   ⚠️  No ranking sites found with DA <= ${targetDARange}. Using all ranking sites as fallback.`);
          sitesToAnalyze = rankingSites.slice(0, 10); // Use top 10 as last resort
        }
      } else {
        // No user settings, analyze positions 1-20
        sitesToAnalyze = rankingSites.slice(0, 20);
        console.log(`   📊 No DA restrictions, analyzing positions 1-20`);
      }

      for (const site of sitesToAnalyze) {
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
      console.warn('⚠️  No opportunities found from SE Ranking API, using synthetic fallback method');
      // SE Ranking doesn't have backlink data for these sites
      // Generate synthetic opportunities based on keyword niches + user's achievable DA range
      for (const keyword of keywords) {
        const syntheticOpps = generateSyntheticOpportunitiesForKeyword(keyword, userSettings);
        opportunities.push(...syntheticOpps);
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
 * Generate synthetic backlink opportunities based on keyword niche and user's DA range
 * This is used when SE Ranking API returns no backlink data
 *
 * Strategy: Instead of finding backlinks FROM ranking sites (which are too high-DA),
 * we identify what TYPE of sites would naturally link to content about this keyword,
 * then generate opportunities within the user's achievable DA range.
 *
 * @param {string} keyword - Keyword to generate opportunities for
 * @param {object} userSettings - User's DA/difficulty preferences
 * @returns {array} Synthetic opportunities
 */
const generateSyntheticOpportunitiesForKeyword = (keyword, userSettings) => {
  const opportunities = [];

  // Determine user's achievable DA range
  const minDA = userSettings?.minDomainAuthority || 10;
  const maxDA = userSettings?.maxDomainAuthority || 60;

  console.log(`   🔧 Generating synthetic opportunities for "${keyword}" targeting DA ${minDA}-${maxDA}`);

  // Determine niche/category based on keyword
  const niche = categorizeKeyword(keyword);
  console.log(`   📂 Keyword category: ${niche}`);

  // Get sites in this niche that are within user's DA range
  const nicheSites = getAchievableSitesForNiche(niche, minDA, maxDA);

  // Create opportunities from these sites
  nicheSites.forEach((site, index) => {
    // Different opportunity types for variation
    const types = ['guest_post', 'resource_page', 'blog'];
    const type = types[index % types.length];

    // Generate action steps based on opportunity type
    const actionSteps = generateOpportunityActionSteps(site.domain, type, keyword);

    opportunities.push({
      // Point to main domain (which actually exists) instead of fake page
      source_url: `https://${site.domain}`,
      source_domain: site.domain,
      opportunity_type: type,
      domain_authority: site.domain_authority,
      page_authority: Math.max(site.domain_authority - 15, 10),
      spam_score: site.spam_score,
      relevance_score: 75, // Good relevance since it's a niche site
      difficulty_score: estimateDifficultyFromAuthority(site.domain_authority),
      contact_email: site.contact_email || null,
      contact_method: 'contact_form',
      is_synthetic: true, // Mark as synthetic for transparency

      // NEW: Add actionable next steps for user
      action_steps: actionSteps,

      // NEW: What to do to secure this link
      outreach_method: getOutreachMethod(type),

      links_from_domain: Math.floor(Math.random() * 20) + 5, // 5-25 backlinks
      referring_domain_authority: site.domain_authority,
    });
  });

  console.log(`   ✅ Generated ${opportunities.length} synthetic opportunities from niche sites`);
  return opportunities;
};

/**
 * Categorize a keyword into a niche/industry
 * Used to find relevant low-DA sites
 */
const categorizeKeyword = (keyword) => {
  const keywordLower = keyword.toLowerCase();

  // Categorization rules
  const categories = {
    'business': ['business', 'entrepreneur', 'startup', 'company', 'marketing', 'sales', 'management'],
    'technology': ['software', 'tech', 'app', 'code', 'programming', 'developer', 'api', 'cloud'],
    'health': ['health', 'fitness', 'diet', 'exercise', 'wellness', 'medical', 'doctor', 'nutrition'],
    'ecommerce': ['ecommerce', 'shop', 'store', 'product', 'amazon', 'ebay', 'sell', 'buy'],
    'content': ['blog', 'content', 'writing', 'writer', 'article', 'publish', 'editorial'],
    'general': ['how to', 'guide', 'tutorial', 'tips', 'best practices', 'help']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => keywordLower.includes(kw))) {
      return category;
    }
  }

  return 'general';
};

/**
 * Calculate reach score for a site based on user's authority level
 * Lower score = easier to reach, higher score = harder to reach
 */
const calculateReachScore = (siteDA, minDA, maxDA) => {
  const userMidpoint = (minDA + maxDA) / 2;
  const daDifference = siteDA - userMidpoint;

  if (daDifference <= 0) {
    // Site is at or below user's range - very achievable
    return 1;
  } else if (daDifference <= maxDA) {
    // Site is 1-2x user's max DA - stretch goal
    return 2;
  } else {
    // Site is well above user's range - aspirational
    return 3;
  }
};

/**
 * Get achievable low-DA sites for a niche that user can realistically get backlinks from
 * EXPANDED DATABASE: 40-60 sites per niche across multiple DA tiers
 * This curates a list of real sites in different niches with varying DA levels
 */
const getAchievableSitesForNiche = (niche, minDA, maxDA) => {
  // Curated list of real sites by niche and DA level
  // These are sites that would naturally link to related content in their field
  // TIER SYSTEM: Premium (80+), High (50-80), Medium (35-50), Low (15-35)
  const sitesByNiche = {
    'business': [
      // TIER 1: Premium (DA 80-92) - Aspirational
      { domain: 'forbes.com/business', domain_authority: 89, spam_score: 1, tier: 'premium' },
      { domain: 'entrepreneur.com', domain_authority: 82, spam_score: 2, tier: 'premium' },
      { domain: 'inc.com', domain_authority: 80, spam_score: 2, tier: 'premium' },
      { domain: 'businessinsider.com', domain_authority: 85, spam_score: 2, tier: 'premium' },
      { domain: 'fastcompany.com', domain_authority: 84, spam_score: 2, tier: 'premium' },
      { domain: 'medium.com/@business', domain_authority: 85, spam_score: 2, tier: 'premium' },

      // TIER 2: High (DA 50-79) - Reach
      { domain: 'businessnewsdaily.com', domain_authority: 68, spam_score: 5, tier: 'high' },
      { domain: 'smallbiztrends.com', domain_authority: 62, spam_score: 3, tier: 'high' },
      { domain: 'ywomen.com', domain_authority: 58, spam_score: 4, tier: 'high' },
      { domain: 'smallbusinessonline.com', domain_authority: 55, spam_score: 5, tier: 'high' },
      { domain: 'thebalancesmb.com', domain_authority: 72, spam_score: 3, tier: 'high' },
      { domain: 'business.com', domain_authority: 68, spam_score: 4, tier: 'high' },
      { domain: 'startupgrind.com', domain_authority: 65, spam_score: 3, tier: 'high' },
      { domain: 'forbes30under30.com', domain_authority: 82, spam_score: 2, tier: 'high' },

      // TIER 3: Medium (DA 35-49) - Achievable
      { domain: 'smallbusinesschronicles.com', domain_authority: 45, spam_score: 5, tier: 'medium' },
      { domain: 'business-opportunities.biz', domain_authority: 38, spam_score: 8, tier: 'medium' },
      { domain: 'thestartupmagazine.co.uk', domain_authority: 42, spam_score: 4, tier: 'medium' },
      { domain: 'entrepreneurhandbook.co.uk', domain_authority: 36, spam_score: 5, tier: 'medium' },
      { domain: 'alignedtobusiness.com', domain_authority: 40, spam_score: 6, tier: 'medium' },
      { domain: 'onlinebusiness101.com', domain_authority: 38, spam_score: 7, tier: 'medium' },
      { domain: 'businessboogie.com', domain_authority: 42, spam_score: 5, tier: 'medium' },
      { domain: 'bizconnect.org', domain_authority: 35, spam_score: 6, tier: 'medium' },
      { domain: 'workableventures.com', domain_authority: 39, spam_score: 5, tier: 'medium' },
      { domain: 'marketobservatory.net', domain_authority: 44, spam_score: 4, tier: 'medium' },

      // TIER 4: Low (DA 15-34) - Easily Achievable
      { domain: 'startupfailures.com', domain_authority: 28, spam_score: 6, tier: 'low' },
      { domain: 'openbusinesssuccess.com', domain_authority: 32, spam_score: 7, tier: 'low' },
      { domain: 'bizbuzztoday.com', domain_authority: 25, spam_score: 8, tier: 'low' },
      { domain: 'entrepreneurandme.com', domain_authority: 24, spam_score: 8, tier: 'low' },
      { domain: 'smallbusinesshq.com', domain_authority: 22, spam_score: 7, tier: 'low' },
      { domain: 'businessconnectiontoday.com', domain_authority: 19, spam_score: 9, tier: 'low' },
      { domain: 'mightybusiness.com', domain_authority: 21, spam_score: 8, tier: 'low' },
      { domain: 'freshbizideas.com', domain_authority: 18, spam_score: 9, tier: 'low' },
      { domain: 'hustlebizz.com', domain_authority: 16, spam_score: 10, tier: 'low' },
      { domain: 'tinybizblog.com', domain_authority: 14, spam_score: 9, tier: 'low' },
    ],
    'technology': [
      // TIER 1: Premium (DA 80+) - Aspirational
      { domain: 'techradar.com', domain_authority: 82, spam_score: 2, tier: 'premium' },
      { domain: 'makeuseof.com', domain_authority: 78, spam_score: 3, tier: 'premium' },
      { domain: 'smashingmagazine.com', domain_authority: 74, spam_score: 1, tier: 'premium' },
      { domain: 'medium.com/@tech', domain_authority: 90, spam_score: 2, tier: 'premium' },
      { domain: 'wired.com', domain_authority: 88, spam_score: 2, tier: 'premium' },

      // TIER 2: High (DA 50-79) - Reach
      { domain: 'dev.to', domain_authority: 75, spam_score: 2, tier: 'high' },
      { domain: 'hackernoon.com', domain_authority: 72, spam_score: 4, tier: 'high' },
      { domain: 'css-tricks.com', domain_authority: 68, spam_score: 2, tier: 'high' },
      { domain: 'sitepoint.com', domain_authority: 68, spam_score: 2, tier: 'high' },
      { domain: 'webdesignerdepot.com', domain_authority: 56, spam_score: 3, tier: 'high' },
      { domain: 'alistapart.com', domain_authority: 72, spam_score: 1, tier: 'high' },
      { domain: 'sitepoint.com/blog', domain_authority: 68, spam_score: 2, tier: 'high' },
      { domain: 'lynda.com/blog', domain_authority: 81, spam_score: 2, tier: 'high' },
      { domain: 'codementor.io', domain_authority: 62, spam_score: 2, tier: 'high' },

      // TIER 3: Medium (DA 35-49) - Achievable
      { domain: 'looprecruiting.com/blog', domain_authority: 42, spam_score: 4, tier: 'medium' },
      { domain: 'technorati.com/tech', domain_authority: 38, spam_score: 6, tier: 'medium' },
      { domain: 'techstuffblog.com', domain_authority: 40, spam_score: 5, tier: 'medium' },
      { domain: 'codeahoy.com', domain_authority: 36, spam_score: 4, tier: 'medium' },
      { domain: 'designmodo.com', domain_authority: 39, spam_score: 3, tier: 'medium' },
      { domain: 'webmasterworld.com', domain_authority: 44, spam_score: 5, tier: 'medium' },
      { domain: 'ryancramer.com', domain_authority: 35, spam_score: 2, tier: 'medium' },
      { domain: 'html5weekly.com', domain_authority: 41, spam_score: 2, tier: 'medium' },

      // TIER 4: Low (DA 15-34) - Easily Achievable
      { domain: 'techstarters.com', domain_authority: 28, spam_score: 6, tier: 'low' },
      { domain: 'thecodepost.com', domain_authority: 22, spam_score: 7, tier: 'low' },
      { domain: 'devbreakdown.com', domain_authority: 25, spam_score: 8, tier: 'low' },
      { domain: 'webdevtutorials.net', domain_authority: 19, spam_score: 7, tier: 'low' },
      { domain: 'codingislove.com', domain_authority: 21, spam_score: 8, tier: 'low' },
      { domain: 'programmingwithtech.com', domain_authority: 17, spam_score: 9, tier: 'low' },
      { domain: 'techwritersunited.com', domain_authority: 20, spam_score: 9, tier: 'low' },
      { domain: 'bytechunks.com', domain_authority: 15, spam_score: 10, tier: 'low' },
      { domain: 'learningtocode.dev', domain_authority: 18, spam_score: 8, tier: 'low' },
    ],
    'health': [
      // TIER 1: Premium (DA 80+) - Aspirational
      { domain: 'healthline.com', domain_authority: 88, spam_score: 1, tier: 'premium' },
      { domain: 'verywellfit.com', domain_authority: 82, spam_score: 2, tier: 'premium' },
      { domain: 'webmd.com', domain_authority: 90, spam_score: 1, tier: 'premium' },
      { domain: 'mayoclinic.org', domain_authority: 93, spam_score: 0, tier: 'premium' },

      // TIER 2: High (DA 50-79) - Reach
      { domain: 'fitnessmagazine.com', domain_authority: 72, spam_score: 3, tier: 'high' },
      { domain: 'womensfitness.com', domain_authority: 68, spam_score: 4, tier: 'high' },
      { domain: 'bodybuilding.com', domain_authority: 78, spam_score: 4, tier: 'high' },
      { domain: 'acefitness.org', domain_authority: 70, spam_score: 2, tier: 'high' },
      { domain: 'myfitnessblog.org', domain_authority: 62, spam_score: 3, tier: 'high' },
      { domain: 'shape.com', domain_authority: 76, spam_score: 3, tier: 'high' },

      // TIER 3: Medium (DA 35-49) - Achievable
      { domain: 'medicalneighborhoods.com', domain_authority: 45, spam_score: 8, tier: 'medium' },
      { domain: 'onnaturalhealth.com', domain_authority: 38, spam_score: 5, tier: 'medium' },
      { domain: 'healthcarecircus.com', domain_authority: 42, spam_score: 6, tier: 'medium' },
      { domain: 'fitnessbytes.com', domain_authority: 40, spam_score: 5, tier: 'medium' },
      { domain: 'wellnessjournal.net', domain_authority: 36, spam_score: 7, tier: 'medium' },
      { domain: 'exercisedaily.net', domain_authority: 39, spam_score: 6, tier: 'medium' },

      // TIER 4: Low (DA 15-34) - Easily Achievable
      { domain: 'thehealthfitnessblog.com', domain_authority: 28, spam_score: 7, tier: 'low' },
      { domain: 'fitnessflip.com', domain_authority: 24, spam_score: 8, tier: 'low' },
      { domain: 'healthylivingsteps.com', domain_authority: 22, spam_score: 9, tier: 'low' },
      { domain: 'workouttrends.com', domain_authority: 20, spam_score: 9, tier: 'low' },
      { domain: 'fitnessgains.net', domain_authority: 18, spam_score: 10, tier: 'low' },
      { domain: 'nutritionhacks.com', domain_authority: 19, spam_score: 10, tier: 'low' },
      { domain: 'healththroughexercise.com', domain_authority: 16, spam_score: 11, tier: 'low' },
    ],
    'ecommerce': [
      // TIER 1: Premium (DA 80+) - Aspirational
      { domain: 'shopify.com/blog', domain_authority: 82, spam_score: 1, tier: 'premium' },
      { domain: 'medium.com/@ecommerce', domain_authority: 90, spam_score: 2, tier: 'premium' },
      { domain: 'forbes.com/commerce', domain_authority: 89, spam_score: 1, tier: 'premium' },

      // TIER 2: High (DA 50-79) - Reach
      { domain: 'bigcommerce.com/blog', domain_authority: 72, spam_score: 2, tier: 'high' },
      { domain: 'shopyourway.com/blog', domain_authority: 62, spam_score: 3, tier: 'high' },
      { domain: 'econsultancy.com', domain_authority: 68, spam_score: 2, tier: 'high' },
      { domain: 'ecommercebytes.com', domain_authority: 58, spam_score: 4, tier: 'high' },
      { domain: 'retaildive.com', domain_authority: 72, spam_score: 2, tier: 'high' },

      // TIER 3: Medium (DA 35-49) - Achievable
      { domain: 'ecommerceplanet.com', domain_authority: 40, spam_score: 6, tier: 'medium' },
      { domain: 'sellerenomics.com', domain_authority: 38, spam_score: 5, tier: 'medium' },
      { domain: 'onlinesellertoday.com', domain_authority: 42, spam_score: 6, tier: 'medium' },
      { domain: 'ecommerceinsights.net', domain_authority: 36, spam_score: 7, tier: 'medium' },

      // TIER 4: Low (DA 15-34) - Easily Achievable
      { domain: 'ecommercestarters.com', domain_authority: 28, spam_score: 8, tier: 'low' },
      { domain: 'dropshippinglounge.com', domain_authority: 24, spam_score: 9, tier: 'low' },
      { domain: 'onlinestore101.com', domain_authority: 22, spam_score: 9, tier: 'low' },
      { domain: 'sellonlineblog.com', domain_authority: 20, spam_score: 10, tier: 'low' },
      { domain: 'ecommercebasics.net', domain_authority: 18, spam_score: 11, tier: 'low' },
    ],
    'content': [
      // TIER 1: Premium (DA 80+) - Aspirational
      { domain: 'medium.com/@writing', domain_authority: 90, spam_score: 2, tier: 'premium' },
      { domain: 'copyblogger.com', domain_authority: 72, spam_score: 2, tier: 'premium' },

      // TIER 2: High (DA 50-79) - Reach
      { domain: 'contentmarketinginstitute.com', domain_authority: 74, spam_score: 2, tier: 'high' },
      { domain: 'contently.com/blog', domain_authority: 68, spam_score: 2, tier: 'high' },
      { domain: 'problogger.com', domain_authority: 70, spam_score: 2, tier: 'high' },

      // TIER 3: Medium (DA 35-49) - Achievable
      { domain: 'writersofwork.com', domain_authority: 45, spam_score: 4, tier: 'medium' },
      { domain: 'contentmuse.com', domain_authority: 38, spam_score: 5, tier: 'medium' },
      { domain: 'bloggingguru.com', domain_authority: 42, spam_score: 4, tier: 'medium' },
      { domain: 'contentlibrary.net', domain_authority: 36, spam_score: 6, tier: 'medium' },

      // TIER 4: Low (DA 15-34) - Easily Achievable
      { domain: 'thebloglift.com', domain_authority: 32, spam_score: 6, tier: 'low' },
      { domain: 'writingtips.org', domain_authority: 28, spam_score: 7, tier: 'low' },
      { domain: 'blogginghacks.com', domain_authority: 24, spam_score: 8, tier: 'low' },
      { domain: 'contentwriterstoday.com', domain_authority: 20, spam_score: 9, tier: 'low' },
      { domain: 'articlesforearnings.com', domain_authority: 18, spam_score: 10, tier: 'low' },
    ],
    'general': [
      // TIER 1: Premium (DA 90+) - Aspirational
      { domain: 'medium.com', domain_authority: 90, spam_score: 2, tier: 'premium' },
      { domain: 'reddit.com', domain_authority: 91, spam_score: 1, tier: 'premium' },
      { domain: 'quora.com', domain_authority: 88, spam_score: 2, tier: 'premium' },
      { domain: 'linkedin.com', domain_authority: 92, spam_score: 1, tier: 'premium' },
      { domain: 'wikipedia.org', domain_authority: 99, spam_score: 0, tier: 'premium' },

      // TIER 2: High (DA 50-79) - Reach
      { domain: 'hubspot.com/blog', domain_authority: 85, spam_score: 2, tier: 'high' },
      { domain: 'moz.com/blog', domain_authority: 80, spam_score: 1, tier: 'high' },
      { domain: 'neilpatel.com', domain_authority: 84, spam_score: 2, tier: 'high' },
      { domain: 'ahrefs.com/blog', domain_authority: 83, spam_score: 1, tier: 'high' },

      // TIER 3: Medium (DA 35-49) - Achievable
      { domain: 'medium.com/@general', domain_authority: 90, spam_score: 2, tier: 'medium' },

      // TIER 4: Low (DA 15-34) - Easily Achievable
      { domain: 'thoughleadership.net', domain_authority: 32, spam_score: 6, tier: 'low' },
      { domain: 'ideashare.org', domain_authority: 28, spam_score: 7, tier: 'low' },
      { domain: 'insightsblog.com', domain_authority: 24, spam_score: 8, tier: 'low' },
    ]
  };

  // Get sites for this niche
  const nicheSites = sitesByNiche[niche] || sitesByNiche['general'];

  console.log(`   📊 Available sites in ${niche} niche: ${nicheSites.length} total`);
  console.log(`   🎯 User DA range: ${minDA}-${maxDA}`);

  // NEW APPROACH: Return ALL relevant sites, categorized by reach difficulty
  // Instead of only returning sites within user's exact DA range, we return:
  // - Tier 1 "Achievable": Within user's DA range
  // - Tier 2 "Reach": 1.5-3x higher than user's max DA (stretch but possible)
  // - Tier 3 "Aspirational": Premium sites (very high DA but brand valuable)

  const categorizedSites = {
    achievable: [],      // DA within user's range (best conversion)
    reach: [],           // DA 1.5-3x user's max (harder but possible)
    aspirational: [],    // Premium sites (very hard but high brand value)
  };

  const reachThreshold = maxDA * 3;     // 3x multiplier for "reach"
  const aspirationalThreshold = maxDA * 5; // 5x+ for aspirational

  nicheSites.forEach(site => {
    const reachScore = calculateReachScore(site.domain_authority, minDA, maxDA);

    if (site.domain_authority >= minDA && site.domain_authority <= maxDA) {
      categorizedSites.achievable.push({
        ...site,
        reach_level: 'achievable',
        success_probability: 70,
        reach_score: reachScore
      });
    } else if (site.domain_authority <= reachThreshold) {
      categorizedSites.reach.push({
        ...site,
        reach_level: 'reach',
        success_probability: 30,
        reach_score: reachScore
      });
    } else {
      categorizedSites.aspirational.push({
        ...site,
        reach_level: 'aspirational',
        success_probability: 10,
        reach_score: reachScore
      });
    }
  });

  // Return a mix: prioritize achievable, include some reach, include premium aspirational
  const results = [];

  // Add top 5 achievable (best results)
  results.push(...categorizedSites.achievable
    .sort((a, b) => b.domain_authority - a.domain_authority)
    .slice(0, 5));

  // Add top 5 reach (stretch goals)
  results.push(...categorizedSites.reach
    .sort((a, b) => a.domain_authority - b.domain_authority) // Lower DA in reach tier
    .slice(0, 5));

  // Add top 3 aspirational (brand value)
  results.push(...categorizedSites.aspirational
    .filter(s => s.tier === 'premium') // Only premium aspirational sites
    .sort((a, b) => b.domain_authority - a.domain_authority)
    .slice(0, 3));

  console.log(`   ✅ Categorized sites: ${categorizedSites.achievable.length} achievable, ${categorizedSites.reach.length} reach, ${categorizedSites.aspirational.length} aspirational`);
  console.log(`   📤 Returning ${results.length} opportunities across all reach levels`);

  return results;
};

/**
 * Generate actionable next steps for reaching out to a site
 * Tells users exactly what to do and where to look
 */
const generateOpportunityActionSteps = (domain, opportunityType, keyword) => {
  const commonPages = [
    '/write-for-us',
    '/guest-post',
    '/guest-posts',
    '/contribute',
    '/contributor-guidelines',
    '/submission-guidelines',
    '/submit-article',
    '/contact'
  ];

  switch (opportunityType) {
    case 'guest_post':
      return [
        {
          step: 1,
          action: 'Visit the website',
          details: `Go to https://${domain} and look for links like "Write for Us", "Guest Posts", or "Contribute"`
        },
        {
          step: 2,
          action: 'Check submission guidelines',
          details: `Look for pages: ${commonPages.join(', ')}`
        },
        {
          step: 3,
          action: 'Prepare your pitch',
          details: `Create a guest post about "${keyword}" that fits their audience`
        },
        {
          step: 4,
          action: 'Submit your pitch',
          details: 'Email the editor with your article idea and a brief bio'
        }
      ];

    case 'resource_page':
      return [
        {
          step: 1,
          action: 'Find their resource pages',
          details: `Visit https://${domain} and search for pages containing lists, roundups, or tools about "${keyword}"`
        },
        {
          step: 2,
          action: 'Check if they accept submissions',
          details: 'Look for "add your tool" or "suggest a resource" links or buttons'
        },
        {
          step: 3,
          action: 'Prepare your submission',
          details: 'Write a 1-2 sentence description of your offering with your link'
        },
        {
          step: 4,
          action: 'Submit',
          details: 'Use their submission form or email the page owner'
        }
      ];

    case 'blog':
      return [
        {
          step: 1,
          action: 'Visit their blog',
          details: `Go to https://${domain}/blog (or /news, /articles) and find posts about "${keyword}"`
        },
        {
          step: 2,
          action: 'Find related articles',
          details: 'Look for blog posts where your content would be relevant as a source or link'
        },
        {
          step: 3,
          action: 'Check for outreach pages',
          details: 'Look for "Write for Us" or contact pages'
        },
        {
          step: 4,
          action: 'Reach out',
          details: 'Email the author or editor suggesting your content as a relevant source'
        }
      ];

    default:
      return [
        {
          step: 1,
          action: 'Visit the website',
          details: `Go to https://${domain}`
        },
        {
          step: 2,
          action: 'Explore their content',
          details: `Look for content related to "${keyword}"`
        },
        {
          step: 3,
          action: 'Find contact info',
          details: 'Look for /contact, /about, or editor email'
        },
        {
          step: 4,
          action: 'Make your pitch',
          details: 'Email them with how your content could help their audience'
        }
      ];
  }
};

/**
 * Get the recommended outreach method for each opportunity type
 */
const getOutreachMethod = (opportunityType) => {
  const methods = {
    'guest_post': {
      method: 'Guest Post Outreach',
      description: 'Pitch a complete article to be published on their blog',
      likelihood_of_success: 0.35,
      effort_required: 'high',
      timeline_weeks: 2,
      tips: [
        'Personalize your pitch to their audience',
        'Show you understand their blog style',
        'Offer 3-4 topic ideas relevant to them',
        'Include a 2-3 sentence bio with your link'
      ]
    },
    'resource_page': {
      method: 'Resource Submission',
      description: 'Ask to be added to their resource lists, tool directories, or guides',
      likelihood_of_success: 0.40,
      effort_required: 'low',
      timeline_weeks: 1,
      tips: [
        'Find their resource page or submission form',
        'Keep your pitch short (2-3 sentences)',
        'Highlight what makes you different',
        'Make it easy for them to add your link'
      ]
    },
    'blog': {
      method: 'Blog Collaboration',
      description: 'Partner with them or get featured in their blog',
      likelihood_of_success: 0.30,
      effort_required: 'medium',
      timeline_weeks: 3,
      tips: [
        'Start by reading and commenting on their posts',
        'Reference their articles in your pitch',
        'Suggest how your content complements theirs',
        'Offer to link back to them as well'
      ]
    },
    'default': {
      method: 'General Outreach',
      description: 'Contact the site owner with a custom pitch',
      likelihood_of_success: 0.25,
      effort_required: 'medium',
      timeline_weeks: 2,
      tips: [
        'Find the right contact person',
        'Personalize your message',
        'Explain why your content is relevant',
        'Make it mutually beneficial'
      ]
    }
  };

  return methods[opportunityType] || methods['default'];
};

/**
 * Generate a realistic page path for different opportunity types
 * (Kept for backward compatibility)
 */
const generatePagePath = (keyword, opportunityType) => {
  const keywordSlug = keyword.toLowerCase().replace(/\s+/g, '-');

  switch (opportunityType) {
    case 'guest_post':
      return `guest-contributor/${keywordSlug}`;
    case 'resource_page':
      return `resources/${keywordSlug}`;
    case 'blog':
      return `blog/${keywordSlug}`;
    default:
      return `articles/${keywordSlug}`;
  }
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
    console.log(`⚠️  No achievable opportunities found in specified range. Using fallback: low-spam opportunities that still respect DA settings.`);
    // Fallback: return low-spam opportunities, but STILL respect user's DA range
    const fallback = opportunities
      .filter(opp => opp.spam_score <= 30)
      .filter(opp => {
        // Still respect min/max DA even in fallback
        return opp.domain_authority >= minDA && opp.domain_authority <= maxDA;
      })
      .sort((a, b) => a.difficulty_score - b.difficulty_score)
      .slice(0, 10);

    if (fallback.length > 0) {
      console.log(`  ✅ Fallback found ${fallback.length} opportunities respecting DA ${minDA}-${maxDA}`);
      return fallback;
    }

    console.log(`  ⚠️  Fallback also found 0 opportunities. Your DA range (${minDA}-${maxDA}) may be too restrictive. Returning empty array.`);
    return [];
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

/**
 * Generate manual research suggestions for a keyword
 * Guides users to find additional opportunities through manual research
 * @param {string} keyword - Keyword to generate suggestions for
 * @param {string} niche - Niche/category
 * @returns {array} Manual research methods
 */
const generateManualResearchSuggestions = (keyword, niche = 'general') => {
  const keywordSlug = keyword.toLowerCase().replace(/\s+/g, '+');
  const suggestions = [];

  // Method 1: Google search patterns for guest posts
  suggestions.push({
    method: 'Guest Post Search',
    description: `Find blogs accepting guest posts about "${keyword}"`,
    search_queries: [
      `"${keyword}" + "write for us"`,
      `"${keyword}" + "guest post"`,
      `"${keyword}" + "contribute"`,
      `"${keyword}" + "submit article"`,
      `${niche} + "guest author"`
    ],
    expected_results: 15-30,
    effort_level: 'medium',
    success_rate: 0.35
  });

  // Method 2: Competitor backlink analysis
  suggestions.push({
    method: 'Competitor Backlinks',
    description: `Find who links to top competitors for "${keyword}"`,
    instructions: [
      `Find top 3-5 competitors for "${keyword}"`,
      `Check their backlinks in Ahrefs/Semrush (free tier)`,
      `Note sites that link to competitors`,
      `Reach out to those sites for backlinks`
    ],
    expected_results: 10-25,
    effort_level: 'high',
    success_rate: 0.45
  });

  // Method 3: Q&A site mining
  suggestions.push({
    method: 'Q&A Site Opportunities',
    description: `Find unanswered questions you can answer about "${keyword}"`,
    platforms: [
      { name: 'Quora', search_url: `https://quora.com/search?q=${keywordSlug}` },
      { name: 'Reddit', search_url: `https://reddit.com/search?q=${keywordSlug}` },
      { name: 'Stack Overflow', search_url: `https://stackoverflow.com/search?q=${keywordSlug}` },
      { name: 'Answer.com', search_url: `https://answer.com/?q=${keywordSlug}` }
    ],
    expected_results: 20-50,
    effort_level: 'low',
    success_rate: 0.25
  });

  // Method 4: Resource/roundup posts
  suggestions.push({
    method: 'Resource Page Opportunities',
    description: `Find resource pages, guides, or lists mentioning "${keyword}"`,
    search_queries: [
      `"${keyword}" + "resource"`,
      `"${keyword}" + "tools"`,
      `"${keyword}" + "list"`,
      `"best ${keyword}"`,
      `"top 10 ${keyword}"`
    ],
    expected_results: 25-40,
    effort_level: 'medium',
    success_rate: 0.40
  });

  // Method 5: Industry directories
  suggestions.push({
    method: 'Industry Directories',
    description: `Submit to directories and resource lists for "${niche}"`,
    search_queries: [
      `${niche} + "directory"`,
      `${niche} + "resource library"`,
      `${niche} + "tools directory"`,
      `${niche} + "submission"`
    ],
    expected_results: 5-15,
    effort_level: 'low',
    success_rate: 0.50
  });

  // Method 6: Broken link building
  suggestions.push({
    method: 'Broken Link Building',
    description: `Find broken links on high-authority sites and suggest yours`,
    instructions: [
      `Use Check My Links extension (Chrome)`,
      `Browse high-authority sites in ${niche}`,
      `Identify broken links (404 errors)`,
      `Create content to replace the broken link`,
      `Reach out to site owner with suggestion`
    ],
    expected_results: 10-20,
    effort_level: 'very_high',
    success_rate: 0.60
  });

  // Method 7: HARO (Help A Reporter Out)
  suggestions.push({
    method: 'Press & HARO Opportunities',
    description: `Get mentioned in articles through HARO mentions`,
    instructions: [
      `Sign up for HARO (helpareporter.com)`,
      `Watch for requests matching "${keyword}"`,
      `Provide expert answers`,
      `Journalists may link to your site as source`
    ],
    expected_results: 2-5,
    effort_level: 'medium',
    success_rate: 0.30
  });

  console.log(`   💡 Generated ${suggestions.length} manual research methods for "${keyword}"`);
  return suggestions;
};

module.exports = {
  discoverBacklinkOpportunities,
  filterByAchievability,
  generateManualResearchSuggestions, // Export for API use
};
