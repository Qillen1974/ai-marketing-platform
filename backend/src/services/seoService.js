const axios = require('axios');
const { getGooglePageSpeedMetrics } = require('./googleService');
const { getMultipleKeywordMetrics } = require('./serperService');
const { crawlWebsite } = require('./crawlerService');

// Common English stop words to exclude from keyword suggestions
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
  'its', 'of', 'on', 'or', 'she', 'that', 'the', 'to', 'was', 'will', 'with', 'you', 'your',
  'i', 'me', 'my', 'we', 'us', 'him', 'her', 'they', 'them', 'this', 'these', 'those', 'about',
  'above', 'after', 'before', 'between', 'into', 'through', 'during', 'which', 'who', 'what',
  'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'just', 'should', 'now', 'would', 'could', 'might', 'must', 'may', 'have', 'do', 'does'
]);

// SEO Analysis - Uses real Google PageSpeed API + mock recommendations
// In future, will integrate with Semrush, Ahrefs, or custom crawler

const performSEOAudit = async (domain, targetKeywords = null) => {
  try {
    // Get real Google metrics
    console.log(`Performing SEO audit for: ${domain}`);
    const googleMetrics = await getGooglePageSpeedMetrics(domain, 'mobile');

    // Get keyword research data (properly formatted)
    console.log('🔍 Getting keyword research data during audit...');
    const keywordData = await getKeywordResearch(domain, targetKeywords);

    // Crawl website for real SEO issues
    console.log('🕷️ Crawling website to detect real SEO issues...');
    const crawlData = await crawlWebsite(domain);

    // Combine Google metrics with keyword data, real crawl issues and recommendations
    const auditData = {
      // Real Google metrics
      ...googleMetrics,
      // Real keyword data from Serper (properly formatted)
      keywordData: keywordData,
      // REAL issues from website crawl (not mocked anymore!)
      issues: crawlData.issues,
      // Real recommendations based on actual issues
      recommendations: generateRecommendationsFromCrawl(crawlData),
      // Crawl statistics
      crawlStats: crawlData.stats,
    };

    return auditData;
  } catch (error) {
    console.error('SEO audit error:', error);
    throw error;
  }
};

const generateMockIssues = () => {
  const issues = [
    {
      severity: 'critical',
      issue: 'Missing meta descriptions on 12 pages',
      impact: 'Impacts click-through rate in search results',
      fix: 'Add unique meta descriptions under 160 characters to all pages',
    },
    {
      severity: 'high',
      issue: 'Poor mobile usability detected',
      impact: 'Affects mobile search rankings',
      fix: 'Ensure responsive design and test on mobile devices',
    },
    {
      severity: 'high',
      issue: 'Page speed below 3 seconds',
      impact: 'Affects user experience and SEO ranking',
      fix: 'Optimize images, enable caching, minimize CSS/JS',
    },
    {
      severity: 'medium',
      issue: 'Missing alt tags on images',
      impact: 'Reduces image search visibility',
      fix: 'Add descriptive alt text to all images',
    },
    {
      severity: 'medium',
      issue: 'Broken internal links detected',
      impact: 'Wastes crawl budget',
      fix: 'Fix broken links or remove them',
    },
    {
      severity: 'low',
      issue: 'Missing H1 tag on homepage',
      impact: 'Minor SEO impact',
      fix: 'Add a clear, keyword-rich H1 tag',
    },
  ];

  return issues.slice(0, Math.floor(Math.random() * 4) + 3);
};

const generateRecommendationsFromCrawl = (crawlData) => {
  const recommendations = [];

  // Recommendation 1: Fix missing meta descriptions
  if (crawlData.stats.pagesWithMissingMeta > 0) {
    recommendations.push({
      category: 'On-Page SEO',
      priority: 'high',
      recommendation: `Add meta descriptions to ${crawlData.stats.pagesWithMissingMeta} pages`,
      impact: 'Can improve click-through rate by 5-10%',
      actionItems: [
        'Write unique meta descriptions for each page',
        'Keep them between 50-160 characters',
        'Include target keywords naturally',
        'Make them compelling to encourage clicks',
      ],
    });
  }

  // Recommendation 2: Fix missing H1 tags
  if (crawlData.stats.pagesWithMissingH1 > 0) {
    recommendations.push({
      category: 'Technical SEO',
      priority: 'high',
      recommendation: `Add H1 tags to ${crawlData.stats.pagesWithMissingH1} pages`,
      impact: 'Helps search engines understand page structure',
      actionItems: [
        'Add one H1 tag per page',
        'Make it descriptive and keyword-rich',
        'Use H2-H6 for subheadings',
      ],
    });
  }

  // Recommendation 3: Add alt tags to images
  const totalImages = crawlData.pages.reduce((acc, p) => acc + p.images.length, 0);
  const imagesWithoutAlt = crawlData.pages.reduce((acc, p) => acc + p.images.filter((img) => !img.hasAlt).length, 0);
  if (imagesWithoutAlt > 0) {
    recommendations.push({
      category: 'Image Optimization',
      priority: 'medium',
      recommendation: `Add alt text to ${imagesWithoutAlt} images`,
      impact: 'Improves image search visibility and accessibility',
      actionItems: [
        'Write descriptive alt text for all images',
        'Include relevant keywords where natural',
        'Aim for 5-10 words per alt text',
        'Improves accessibility for screen readers',
      ],
    });
  }

  // Recommendation 4: Fix broken internal links
  if (crawlData.stats.brokenInternalLinks > 0) {
    recommendations.push({
      category: 'Technical SEO',
      priority: 'high',
      recommendation: `Fix ${crawlData.stats.brokenInternalLinks} broken internal links`,
      impact: 'Prevents wasted crawl budget and improves user experience',
      actionItems: [
        'Identify all broken links',
        'Update links to correct URLs',
        'Use 301 redirects if pages were moved',
        'Monitor for future broken links',
      ],
    });
  }

  // Recommendation 5: Improve internal linking strategy
  if (crawlData.stats.internalLinksCount > 0) {
    recommendations.push({
      category: 'Content Strategy',
      priority: 'medium',
      recommendation: 'Improve internal linking strategy',
      impact: 'Distributes page authority and helps indexing',
      actionItems: [
        `Current internal links: ${crawlData.stats.internalLinksCount}`,
        'Link from high-authority pages to important pages',
        'Use descriptive anchor text',
        'Create topic clusters with strategic linking',
      ],
    });
  }

  // Default recommendation if no issues
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'Maintenance',
      priority: 'low',
      recommendation: 'Keep monitoring your site for SEO issues',
      impact: 'Ensures continued visibility in search results',
      actionItems: [
        'Run audits monthly',
        'Monitor ranking changes weekly',
        'Keep content fresh and updated',
        'Build backlinks consistently',
      ],
    });
  }

  return recommendations;
};

const generateMockRecommendations = () => {
  return [
    {
      category: 'Content',
      priority: 'high',
      recommendation: 'Create content for high-volume, low-difficulty keywords',
      keywords: ['keyword1', 'keyword2', 'keyword3'],
      estimatedTraffic: Math.floor(Math.random() * 500) + 100,
    },
    {
      category: 'Technical',
      priority: 'high',
      recommendation: 'Improve Core Web Vitals for better ranking',
      metrics: ['LCP', 'FID', 'CLS'],
      estimatedImpact: 'Potential +15% organic traffic improvement',
    },
    {
      category: 'Link Building',
      priority: 'medium',
      recommendation: 'Build backlinks from domain authority 30+ sites',
      targetQuantity: 5,
      estimatedAuthority: 'DA 45+',
    },
    {
      category: 'Content Optimization',
      priority: 'medium',
      recommendation: 'Update existing top-performing pages with new keywords',
      pagesToUpdate: 8,
      estimatedTraffic: Math.floor(Math.random() * 300) + 50,
    },
  ];
};

const getKeywordResearch = async (domain, targetKeywords) => {
  try {
    console.log('🔍 Starting keyword research...');

    // Parse keywords from input
    const keywords = targetKeywords
      ? targetKeywords.split(',').map((kw) => kw.trim())
      : ['digital marketing', 'seo services', 'content marketing'];

    console.log(`Found ${keywords.length} keywords to research: ${keywords.join(', ')}`);

    // Get real metrics from Serper API
    const metricsArray = await getMultipleKeywordMetrics(keywords);

    // Transform Serper results to our keyword format
    const keywordData = metricsArray.map((metrics) => ({
      keyword: metrics.keyword,
      searchVolume: metrics.estimatedVolume,
      difficulty: metrics.difficulty,
      competitorCount: metrics.searchResults,
      cpc: parseFloat(metrics.estimatedCPC),
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
      currentPosition: null, // Real positions come from ranking checks via Serper API
      // Additional metrics from Serper
      topResultsCount: metrics.topResults.length,
      hasAnswerBox: metrics.answerBox,
      hasKnowledge: metrics.knowledge,
      adsCount: metrics.ads,
      isFromRealAPI: metrics.isReal,
    }));

    return keywordData;
  } catch (error) {
    console.error('Keyword research error:', error);
    throw error;
  }
};

/**
 * Suggest keywords by scanning website
 * Extracts keywords from website metadata and content
 * @param {string} domain - Website domain to scan
 * @returns {array} Array of suggested keywords
 */
const suggestKeywordsFromWebsite = async (domain) => {
  try {
    console.log(`🔍 Scanning website ${domain} for keyword suggestions...`);

    // Fetch the website
    const url = domain.startsWith('http') ? domain : `https://${domain}`;

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const suggestedKeywords = new Map(); // keyword -> frequency

    // Extract from title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      extractKeywordsFromText(titleMatch[1], suggestedKeywords, 3); // Higher weight for title
    }

    // Extract from meta description
    const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (metaDescMatch) {
      extractKeywordsFromText(metaDescMatch[1], suggestedKeywords, 2);
    }

    // Extract from h1 tags
    const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
    if (h1Matches) {
      h1Matches.forEach(h1 => {
        const text = h1.replace(/<[^>]*>/g, '');
        extractKeywordsFromText(text, suggestedKeywords, 2);
      });
    }

    // Extract from h2 tags
    const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
    if (h2Matches) {
      h2Matches.forEach(h2 => {
        const text = h2.replace(/<[^>]*>/g, '');
        extractKeywordsFromText(text, suggestedKeywords, 1.5);
      });
    }

    // Extract from body text (first 2000 characters)
    const bodyMatch = html.match(/<body[^>]*>[\s\S]*?<\/body>/i);
    if (bodyMatch) {
      const bodyText = bodyMatch[0].replace(/<[^>]*>/g, '').substring(0, 2000);
      extractKeywordsFromText(bodyText, suggestedKeywords, 1);
    }

    // Extract from meta keywords if present
    const metaKeywordsMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]*)"/i);
    if (metaKeywordsMatch) {
      const keywords = metaKeywordsMatch[1].split(',').map(k => k.trim().toLowerCase());
      keywords.forEach(kw => {
        if (kw && !STOP_WORDS.has(kw)) {
          suggestedKeywords.set(kw, (suggestedKeywords.get(kw) || 0) + 2);
        }
      });
    }

    // Convert to sorted array
    const sortedKeywords = Array.from(suggestedKeywords.entries())
      .filter(([kw]) => kw.length > 2) // Filter out very short keywords
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .slice(0, 15) // Return top 15
      .map(([keyword]) => keyword);

    console.log(`✅ Found ${sortedKeywords.length} keyword suggestions`);
    return sortedKeywords;
  } catch (error) {
    console.error('❌ Error scanning website for keywords:', error.message);
    // Return common default suggestions if scanning fails
    return [
      'digital marketing', 'seo services', 'content marketing',
      'online marketing', 'web marketing', 'marketing services'
    ];
  }
};

/**
 * Helper function to extract keywords from text
 * @param {string} text - Text to extract keywords from
 * @param {Map} keywordMap - Map to store keyword frequencies
 * @param {number} weight - Weight multiplier for this text source
 */
const extractKeywordsFromText = (text, keywordMap, weight = 1) => {
  // Remove HTML entities and special characters
  const cleanText = text
    .replace(/&[a-z]+;/gi, '')
    .replace(/[^\w\s\-]/g, '')
    .toLowerCase();

  // Split into words
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);

  // Extract single words and 2-word phrases
  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Single word
    if (!STOP_WORDS.has(word) && word.length > 2) {
      const key = word;
      keywordMap.set(key, (keywordMap.get(key) || 0) + weight);
    }

    // Two-word phrases
    if (i < words.length - 1) {
      const phrase = `${word} ${words[i + 1]}`;
      if (!STOP_WORDS.has(word) && !STOP_WORDS.has(words[i + 1]) &&
          word.length > 2 && words[i + 1].length > 2) {
        keywordMap.set(phrase, (keywordMap.get(phrase) || 0) + (weight * 0.8));
      }
    }
  }
};

/**
 * Get keyword suggestions and their metrics from Serper
 * @param {string} domain - Website domain
 * @returns {array} Array of suggested keywords with metrics
 */
const getSuggestedKeywordsWithMetrics = async (domain) => {
  try {
    // Get keyword suggestions from website
    const suggestedKeywords = await suggestKeywordsFromWebsite(domain);

    if (suggestedKeywords.length === 0) {
      return [];
    }

    console.log(`📊 Fetching metrics for ${suggestedKeywords.length} suggested keywords...`);

    // Get metrics for suggested keywords from Serper
    const metricsArray = await getMultipleKeywordMetrics(suggestedKeywords);

    // Format the results
    const keywordsWithMetrics = metricsArray.map((metrics) => ({
      keyword: metrics.keyword,
      searchVolume: metrics.estimatedVolume,
      difficulty: metrics.difficulty,
      competitorCount: metrics.searchResults,
      cpc: parseFloat(metrics.estimatedCPC),
      trend: 'stable',
      currentPosition: 0,
      isFromRealAPI: metrics.isReal,
    }));

    return keywordsWithMetrics;
  } catch (error) {
    console.error('Error getting suggested keywords with metrics:', error);
    throw error;
  }
};

module.exports = {
  performSEOAudit,
  getKeywordResearch,
  suggestKeywordsFromWebsite,
  getSuggestedKeywordsWithMetrics,
};
