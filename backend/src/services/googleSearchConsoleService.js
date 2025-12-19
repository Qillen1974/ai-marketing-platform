const { google } = require('googleapis');

/**
 * Google Search Console API Service
 * Provides access to backlinks (external links) data
 * Documentation: https://developers.google.com/webmaster-tools/v1/api_reference_index
 */

// Search Console API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
];

/**
 * Get authenticated Search Console client
 */
const getSearchConsoleClient = async () => {
  let serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    return null;
  }

  try {
    // Railway converts \n escape sequences to actual newlines, which breaks JSON parsing
    // Replace actual newlines with \n escape sequences so JSON.parse works
    serviceAccountJson = serviceAccountJson.replace(/\r?\n/g, '\\n');

    const serviceAccount = JSON.parse(serviceAccountJson);

    // After parsing, convert \n back to actual newlines for the private key
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });

    // Use webmasters API for links data (searchconsole API doesn't have links endpoint)
    const webmasters = google.webmasters({ version: 'v3', auth });
    return webmasters;
  } catch (error) {
    console.error('❌ Failed to initialize Search Console client:', error.message);
    return null;
  }
};

/**
 * Format domain for Search Console API
 * GSC uses site URL format: https://example.com/ or sc-domain:example.com
 */
const formatSiteUrl = (domain) => {
  // Remove protocol if present
  let cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Try both URL property and domain property formats
  return {
    urlProperty: `https://${cleanDomain}/`,
    domainProperty: `sc-domain:${cleanDomain}`,
  };
};

/**
 * Get list of sites the service account has access to
 */
const listSites = async () => {
  try {
    const searchconsole = await getSearchConsoleClient();
    if (!searchconsole) return [];

    console.log('📋 Fetching Search Console sites...');
    const response = await searchconsole.sites.list();

    const sites = response.data.siteEntry || [];
    console.log(`✅ Found ${sites.length} sites in Search Console`);

    return sites.map(site => ({
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel,
    }));
  } catch (error) {
    console.error('❌ Error listing Search Console sites:', error.message);
    return [];
  }
};

/**
 * Get external links (backlinks) pointing to the site
 * @param {string} domain - Domain to check
 * @returns {object} - Backlinks data
 */
const getBacklinks = async (domain) => {
  try {
    const searchconsole = await getSearchConsoleClient();
    if (!searchconsole) {
      return { error: 'Search Console client not configured' };
    }

    const { urlProperty, domainProperty } = formatSiteUrl(domain);
    console.log(`🔗 Fetching backlinks for ${domain}`);
    console.log(`   Trying URL property: ${urlProperty}`);
    console.log(`   Trying Domain property: ${domainProperty}`);

    let siteUrl = urlProperty;
    let links = null;

    // Try URL property first, then domain property
    for (const tryUrl of [urlProperty, domainProperty]) {
      try {
        console.log(`   Attempting with: ${tryUrl}`);
        const response = await searchconsole.links.list({
          siteUrl: tryUrl,
        });
        links = response.data;
        siteUrl = tryUrl;
        console.log(`   ✅ Success with: ${tryUrl}`);
        break;
      } catch (err) {
        console.log(`   ⚠️ Failed with ${tryUrl}: ${err.message}`);
        if (err.code === 403) {
          console.log('   ⚠️ Permission denied - ensure service account has access to this property');
        }
      }
    }

    if (!links) {
      return {
        error: 'Could not access Search Console for this domain',
        suggestion: 'Add the service account email to your Search Console property',
      };
    }

    // Process external links (backlinks from other sites)
    const externalLinks = links.externalLinks || [];
    const internalLinks = links.internalLinks || [];

    console.log(`✅ Found ${externalLinks.length} external linking sites`);

    // Get detailed backlinks for top referring sites
    const detailedBacklinks = [];

    for (const linkSite of externalLinks.slice(0, 100)) { // Top 100 referring domains
      try {
        // Get specific URLs from this referring domain
        const detailResponse = await searchconsole.links.list({
          siteUrl: siteUrl,
        });

        detailedBacklinks.push({
          referringDomain: linkSite.siteUrl || linkSite,
          targetUrl: siteUrl,
          // GSC doesn't provide anchor text in links API
          anchorText: null,
          isDofollow: true, // GSC doesn't distinguish, assume dofollow
        });
      } catch (err) {
        // Just add basic info if detail fetch fails
        detailedBacklinks.push({
          referringDomain: typeof linkSite === 'string' ? linkSite : linkSite.siteUrl,
          targetUrl: siteUrl,
          anchorText: null,
          isDofollow: true,
        });
      }
    }

    return {
      success: true,
      siteUrl: siteUrl,
      stats: {
        totalExternalLinks: externalLinks.length,
        totalInternalLinks: internalLinks.length,
        totalReferringDomains: externalLinks.length,
      },
      backlinks: detailedBacklinks,
      externalLinks: externalLinks,
      internalLinks: internalLinks,
    };
  } catch (error) {
    console.error('❌ Error fetching backlinks from GSC:', error.message);
    return {
      error: error.message,
      code: error.code,
    };
  }
};

/**
 * Get top linking sites (referring domains)
 * @param {string} domain - Domain to check
 * @param {number} limit - Max results
 */
const getTopReferringDomains = async (domain, limit = 100) => {
  try {
    const result = await getBacklinks(domain);

    if (result.error) {
      return { domains: [], error: result.error };
    }

    const domains = result.externalLinks.slice(0, limit).map((site, index) => ({
      domain: typeof site === 'string' ? site : site.siteUrl,
      rank: index + 1,
    }));

    return { domains };
  } catch (error) {
    console.error('❌ Error getting top referring domains:', error.message);
    return { domains: [], error: error.message };
  }
};

/**
 * Get backlink stats summary
 * @param {string} domain - Domain to check
 */
const getBacklinkStats = async (domain) => {
  try {
    const result = await getBacklinks(domain);

    if (result.error) {
      return null;
    }

    return {
      totalBacklinks: result.stats.totalExternalLinks,
      totalReferringDomains: result.stats.totalReferringDomains,
      // GSC doesn't provide dofollow/nofollow breakdown
      dofollowCount: result.stats.totalExternalLinks,
      nofollowCount: 0,
    };
  } catch (error) {
    console.error('❌ Error getting backlink stats:', error.message);
    return null;
  }
};

/**
 * Check if service account has access to a domain
 * @param {string} domain - Domain to check
 */
const checkAccess = async (domain) => {
  try {
    const sites = await listSites();
    const { urlProperty, domainProperty } = formatSiteUrl(domain);

    const hasAccess = sites.some(site =>
      site.siteUrl === urlProperty ||
      site.siteUrl === domainProperty ||
      site.siteUrl.includes(domain)
    );

    return {
      hasAccess,
      sites,
      checkedFor: [urlProperty, domainProperty],
    };
  } catch (error) {
    return {
      hasAccess: false,
      error: error.message,
    };
  }
};

module.exports = {
  listSites,
  getBacklinks,
  getTopReferringDomains,
  getBacklinkStats,
  checkAccess,
  formatSiteUrl,
};
