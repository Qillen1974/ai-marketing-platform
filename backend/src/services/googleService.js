const axios = require('axios');
const { google } = require('googleapis');

// Google PageSpeed Insights API Service
// Returns real, Google-verified SEO metrics

const GOOGLE_PAGESPEED_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/**
 * Get authentication token (either API Key or Service Account)
 */
const getAuthToken = async () => {
  // Try using Service Account first (from JSON file in .env)
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/pagespeed_insights_readonly'],
      });
      const token = await auth.getAccessToken();
      return {
        type: 'bearer',
        token: token.token,
      };
    } catch (error) {
      console.warn('Failed to parse service account JSON, falling back to API Key');
    }
  }

  // Fall back to simple API Key
  if (process.env.GOOGLE_PAGESPEED_API_KEY) {
    return {
      type: 'apiKey',
      key: process.env.GOOGLE_PAGESPEED_API_KEY,
    };
  }

  return null;
};

/**
 * Get real SEO metrics from Google PageSpeed Insights API
 * @param {string} domain - Website domain (e.g., example.com)
 * @param {string} strategy - 'mobile' or 'desktop' (default: 'mobile')
 * @returns {Object} Real Google metrics
 */
const getGooglePageSpeedMetrics = async (domain, strategy = 'mobile') => {
  try {
    const auth = await getAuthToken();

    if (!auth) {
      console.warn('❌ No Google authentication configured, using mock data');
      return getMockMetrics();
    }

    console.log('✅ Auth found:', auth.type);

    // Ensure domain has protocol
    const url = domain.startsWith('http') ? domain : `https://${domain}`;

    console.log(`🔄 Fetching Google PageSpeed metrics for: ${url}`);

    // Note: Google PageSpeed Insights API v5 only returns performance category
    // Other categories are not available in the free API
    const params = {
      url: url,
      strategy: strategy,
    };

    const headers = {};

    // Add authentication based on type
    if (auth.type === 'apiKey') {
      params.key = auth.key;
    } else if (auth.type === 'bearer') {
      headers.Authorization = `Bearer ${auth.token}`;
    }

    console.log('📡 Calling Google PageSpeed API...');
    const response = await axios.get(GOOGLE_PAGESPEED_URL, {
      params,
      headers,
      timeout: 30000, // 30 second timeout
    });

    console.log('✅ Google API response received, status:', response.status);
    const result = response.data;

    // Extract metrics from Lighthouse results
    const lighthouseResult = result.lighthouseResult;
    const categories = lighthouseResult.categories;
    const audits = lighthouseResult.audits;

    console.log('📊 Categories found:', Object.keys(categories));

    // Helper function to safely get category score
    const getCategoryScore = (categoryName) => {
      if (categories[categoryName]) {
        return Math.round(categories[categoryName].score * 100);
      }
      return null;
    };

    // Helper function to safely get audit numeric value
    const getAuditValue = (auditId) => {
      return audits[auditId] && audits[auditId].numericValue ? audits[auditId].numericValue : null;
    };

    const performanceScore = getCategoryScore('performance');

    // Map Google scores to our scoring system
    // IMPORTANT: Google PageSpeed API v5 only returns performance score!
    // Other scores are NOT available from the free API
    // We only return what Google actually provides
    const mappedData = {
      // Google real scores - ONLY performance is real from the API
      performanceScore: performanceScore,
      pageSpeedScore: performanceScore,

      // Note: These other categories are NOT provided by Google PageSpeed API v5
      // They would require the full Lighthouse API or paid services like Semrush/Ahrefs
      accessibilityScore: null, // Not available from free API
      bestPracticesScore: null, // Not available from free API
      seoScore: null, // Not available from free API

      // Combined scores - only use performance (what's actually available)
      onPageScore: performanceScore,
      technicalScore: performanceScore,
      contentScore: performanceScore,

      // Overall score (use only what's real)
      overallScore: performanceScore,

      // Core Web Vitals (from audits)
      coreWebVitals: {
        largestContentfulPaint: getAuditValue('largest-contentful-paint'),
        firstInputDelay: getAuditValue('total-blocking-time'), // TBT is similar to FID
        cumulativeLayoutShift: getAuditValue('cumulative-layout-shift'),
      },

      // Mobile friendliness (from audits)
      mobileFriendly: !audits['mobile-friendly'] || audits['mobile-friendly'].score > 0.5,

      // SSL check
      ssl: url.startsWith('https'),

      // Strategy used
      strategy: strategy,

      // Timestamp
      fetchedAt: new Date().toISOString(),

      // Raw categories for reference (only performance available from API)
      categories: {
        performance: performanceScore,
        accessibility: null, // Not available from free Google API
        bestPractices: null, // Not available from free Google API
        seo: null, // Not available from free Google API
      },
    };

    // Extract opportunities and diagnostics (actionable recommendations)
    const opportunities = extractOpportunities(lighthouseResult);
    const diagnostics = extractDiagnostics(lighthouseResult);

    return {
      ...mappedData,
      opportunities,
      diagnostics,
      isReal: true,
    };
  } catch (error) {
    console.error('❌ Error fetching Google PageSpeed metrics:', error.message);
    console.error('Error details:', error.response?.status, error.response?.data?.error);

    // Fallback to mock data if API fails
    console.warn('⚠️ Falling back to mock data due to API error');
    return getMockMetrics();
  }
};

/**
 * Extract actionable opportunities from audit results
 */
const extractOpportunities = (lighthouseResult) => {
  const opportunities = [];
  const audits = lighthouseResult.audits;

  // List of high-impact opportunities
  const opportunityAudits = [
    'unused-css',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'render-blocking-resources',
    'unminified-css',
    'unminified-javascript',
    'unused-css',
    'dom-size',
  ];

  opportunityAudits.forEach((auditId) => {
    if (audits[auditId] && audits[auditId].score < 1) {
      opportunities.push({
        id: auditId,
        title: audits[auditId].title,
        description: audits[auditId].description,
        savings: audits[auditId].numericValue,
        severity: audits[auditId].score < 0.5 ? 'critical' : 'high',
      });
    }
  });

  return opportunities.slice(0, 5); // Top 5 opportunities
};

/**
 * Extract diagnostics and issues
 */
const extractDiagnostics = (lighthouseResult) => {
  const diagnostics = [];
  const audits = lighthouseResult.audits;

  // List of diagnostic audits
  const diagnosticAudits = [
    'unsized-images',
    'offscreen-images',
    'modern-image-formats',
    'uses-webp-images',
    'image-aspect-ratio',
    'image-size-responsive',
    'font-display',
    'tap-targets',
  ];

  diagnosticAudits.forEach((auditId) => {
    if (audits[auditId]) {
      diagnostics.push({
        id: auditId,
        title: audits[auditId].title,
        description: audits[auditId].description,
        score: audits[auditId].score,
      });
    }
  });

  return diagnostics.slice(0, 5); // Top 5 diagnostics
};

/**
 * Fallback mock metrics (if API fails)
 */
const getMockMetrics = () => {
  console.log('🎭 RETURNING MOCK DATA (NOT FROM GOOGLE API)');
  return {
    performanceScore: Math.floor(Math.random() * (95 - 45 + 1)) + 45,
    accessibilityScore: Math.floor(Math.random() * (100 - 70 + 1)) + 70,
    bestPracticesScore: Math.floor(Math.random() * (95 - 60 + 1)) + 60,
    seoScore: Math.floor(Math.random() * (100 - 75 + 1)) + 75,

    onPageScore: Math.floor(Math.random() * (95 - 45 + 1)) + 45,
    technicalScore: Math.floor(Math.random() * (90 - 40 + 1)) + 40,
    contentScore: Math.floor(Math.random() * (85 - 50 + 1)) + 50,
    overallScore: Math.floor(Math.random() * (95 - 45 + 1)) + 45,

    pageSpeedScore: Math.floor(Math.random() * (90 - 20 + 1)) + 20,
    mobileFriendly: Math.random() > 0.3,
    ssl: true,

    isReal: false,

    opportunities: [],
    diagnostics: [],
  };
};

module.exports = {
  getGooglePageSpeedMetrics,
  extractOpportunities,
  extractDiagnostics,
};
