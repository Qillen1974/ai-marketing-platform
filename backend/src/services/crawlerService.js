const axios = require('axios');
const { parse } = require('node-html-parser');
const { URL } = require('url');

// Website Crawler Service
// Crawls websites to detect real SEO issues

const DEFAULT_TIMEOUT = 10000;
const MAX_PAGES = 50; // Limit pages crawled to avoid timeouts
const CRAWL_DELAY = 500; // ms between requests

/**
 * Crawl website and collect SEO data
 * @param {string} domain - Domain to crawl
 * @returns {object} Crawl results with issues
 */
const crawlWebsite = async (domain) => {
  try {
    console.log(`🔍 Starting website crawl for: ${domain}`);

    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    const crawlData = {
      domain,
      baseUrl,
      pages: [],
      urls: new Set(),
      issues: [],
      stats: {
        totalPages: 0,
        pagesWithMissingMeta: 0,
        pagesWithMissingH1: 0,
        pagesWithMissingAltTags: 0,
        brokenInternalLinks: 0,
        externalLinksCount: 0,
        internalLinksCount: 0,
      },
    };

    // Start crawl from homepage
    await crawlPage(baseUrl, baseUrl, crawlData);

    console.log(`✅ Crawl completed: ${crawlData.pages.length} pages analyzed`);

    // Analyze crawled data for issues
    const detectedIssues = analyzeForIssues(crawlData);

    return {
      ...crawlData,
      issues: detectedIssues,
      stats: crawlData.stats,
    };
  } catch (error) {
    console.error('❌ Crawl error:', error.message);
    throw error;
  }
};

/**
 * Recursively crawl pages
 * @param {string} url - URL to crawl
 * @param {string} baseUrl - Base URL for internal link detection
 * @param {object} crawlData - Accumulator for crawl data
 */
const crawlPage = async (url, baseUrl, crawlData) => {
  try {
    // Prevent revisiting same URL
    if (crawlData.urls.has(url)) {
      return;
    }

    // Stop if we've crawled max pages
    if (crawlData.pages.length >= MAX_PAGES) {
      console.log(`⚠️ Reached max page limit (${MAX_PAGES})`);
      return;
    }

    crawlData.urls.add(url);
    console.log(`📄 Crawling: ${url}`);

    // Fetch page
    const response = await axios.get(url, {
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      maxRedirects: 5,
    });

    const html = response.data;
    const root = parse(html);
    const baseUrlObj = new URL(baseUrl);

    // Extract page data
    const pageData = {
      url,
      title: root.querySelector('title')?.text || '',
      metaDescription: root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      h1Tags: Array.from(root.querySelectorAll('h1')).map((h) => h.text),
      h2Tags: Array.from(root.querySelectorAll('h2')).map((h) => h.text),
      images: [],
      internalLinks: [],
      externalLinks: [],
      issues: [],
    };

    // Check images for alt tags
    const images = root.querySelectorAll('img');
    images.forEach((img) => {
      const imgData = {
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || '',
        hasAlt: !!img.getAttribute('alt'),
      };
      pageData.images.push(imgData);

      // Track missing alt tags
      if (!imgData.hasAlt && imgData.src) {
        pageData.issues.push({
          severity: 'medium',
          issue: `Missing alt tag on image: ${imgData.src}`,
          page: url,
        });
        crawlData.stats.pagesWithMissingAltTags++;
      }
    });

    // Check for missing meta description
    if (!pageData.metaDescription) {
      pageData.issues.push({
        severity: 'high',
        issue: 'Missing meta description',
        page: url,
      });
      crawlData.stats.pagesWithMissingMeta++;
    } else if (pageData.metaDescription.length > 160) {
      pageData.issues.push({
        severity: 'medium',
        issue: `Meta description too long (${pageData.metaDescription.length} characters, max 160)`,
        page: url,
      });
    } else if (pageData.metaDescription.length < 50) {
      pageData.issues.push({
        severity: 'low',
        issue: `Meta description too short (${pageData.metaDescription.length} characters, recommended 50-160)`,
        page: url,
      });
    }

    // Check for H1 tag
    if (pageData.h1Tags.length === 0) {
      pageData.issues.push({
        severity: 'high',
        issue: 'Missing H1 tag',
        page: url,
      });
      crawlData.stats.pagesWithMissingH1++;
    } else if (pageData.h1Tags.length > 1) {
      pageData.issues.push({
        severity: 'medium',
        issue: `Multiple H1 tags found (${pageData.h1Tags.length}), should only have 1`,
        page: url,
      });
    }

    // Extract and validate links
    const links = root.querySelectorAll('a');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;

      try {
        const linkUrl = new URL(href, url);

        // Check if internal or external
        if (linkUrl.hostname === baseUrlObj.hostname) {
          pageData.internalLinks.push(linkUrl.href);
          crawlData.stats.internalLinksCount++;

          // Queue for crawling if not visited
          if (!crawlData.urls.has(linkUrl.href) && crawlData.pages.length < MAX_PAGES) {
            // Small delay to be respectful
            await new Promise((resolve) => setTimeout(resolve, CRAWL_DELAY));
            await crawlPage(linkUrl.href, baseUrl, crawlData);
          }
        } else {
          pageData.externalLinks.push(linkUrl.href);
          crawlData.stats.externalLinksCount++;
        }
      } catch (linkError) {
        console.warn(`⚠️ Invalid link: ${href}`);
      }
    }

    // Check for broken internal links (404s)
    for (const internalLink of pageData.internalLinks) {
      try {
        const linkResponse = await axios.head(internalLink, {
          timeout: 5000,
          maxRedirects: 3,
        });
        if (linkResponse.status >= 400) {
          pageData.issues.push({
            severity: 'high',
            issue: `Broken internal link (${linkResponse.status}): ${internalLink}`,
            page: url,
          });
          crawlData.stats.brokenInternalLinks++;
        }
      } catch (linkCheckError) {
        // Link is broken or unreachable
        pageData.issues.push({
          severity: 'high',
          issue: `Broken internal link: ${internalLink}`,
          page: url,
        });
        crawlData.stats.brokenInternalLinks++;
      }
    }

    // Add page data to crawl results
    crawlData.pages.push(pageData);
    crawlData.stats.totalPages = crawlData.pages.length;

    // Merge issues
    crawlData.issues.push(...pageData.issues);
  } catch (error) {
    console.warn(`⚠️ Error crawling ${url}:`, error.message);
  }
};

/**
 * Analyze crawled data and generate SEO issues report
 * @param {object} crawlData - Crawl data
 * @returns {array} Detected issues
 */
const analyzeForIssues = (crawlData) => {
  const issues = [];

  // Aggregate all issues from pages
  const pageIssues = crawlData.pages.reduce((acc, page) => [...acc, ...page.issues], []);

  // Group issues by type
  const criticalIssues = pageIssues.filter((i) => i.severity === 'critical');
  const highIssues = pageIssues.filter((i) => i.severity === 'high');
  const mediumIssues = pageIssues.filter((i) => i.severity === 'medium');
  const lowIssues = pageIssues.filter((i) => i.severity === 'low');

  // Missing meta descriptions
  if (crawlData.stats.pagesWithMissingMeta > 0) {
    issues.push({
      severity: 'high',
      issue: `Missing meta descriptions on ${crawlData.stats.pagesWithMissingMeta} pages`,
      impact: 'Impacts click-through rate in search results',
      fix: 'Add unique, compelling meta descriptions (50-160 characters) to all pages',
      affectedPages: crawlData.pages
        .filter((p) => !p.metaDescription)
        .map((p) => p.url)
        .slice(0, 5),
    });
  }

  // Missing H1 tags
  if (crawlData.stats.pagesWithMissingH1 > 0) {
    issues.push({
      severity: 'high',
      issue: `Missing H1 tag on ${crawlData.stats.pagesWithMissingH1} pages`,
      impact: 'H1 tags help search engines understand page content',
      fix: 'Add a single, keyword-rich H1 tag to every page',
      affectedPages: crawlData.pages
        .filter((p) => p.h1Tags.length === 0)
        .map((p) => p.url)
        .slice(0, 5),
    });
  }

  // Missing alt tags on images
  if (crawlData.stats.pagesWithMissingAltTags > 0) {
    issues.push({
      severity: 'medium',
      issue: `${
        crawlData.pages.reduce((acc, p) => acc + p.images.filter((img) => !img.hasAlt).length, 0)
      } images missing alt tags`,
      impact: 'Improves image search visibility and accessibility',
      fix: 'Add descriptive alt text to all images, including target keywords where relevant',
      affectedImages: crawlData.pages
        .flatMap((p) => p.images.filter((img) => !img.hasAlt).map((img) => img.src))
        .slice(0, 10),
    });
  }

  // Broken internal links
  if (crawlData.stats.brokenInternalLinks > 0) {
    issues.push({
      severity: 'high',
      issue: `${crawlData.stats.brokenInternalLinks} broken internal links detected`,
      impact: 'Wastes crawl budget and harms user experience',
      fix: 'Fix broken links or remove them. Use 301 redirects if pages were moved.',
      affectedLinks: pageIssues
        .filter((i) => i.issue.includes('Broken internal link'))
        .map((i) => i.issue)
        .slice(0, 5),
    });
  }

  // Pages with multiple H1 tags
  const multipleH1Pages = crawlData.pages.filter((p) => p.h1Tags.length > 1);
  if (multipleH1Pages.length > 0) {
    issues.push({
      severity: 'medium',
      issue: `${multipleH1Pages.length} pages have multiple H1 tags`,
      impact: 'Confuses search engines about page topic',
      fix: 'Keep only one H1 tag per page. Use H2-H6 for subheadings.',
      affectedPages: multipleH1Pages.map((p) => p.url).slice(0, 5),
    });
  }

  // Long meta descriptions
  const longMetaPages = crawlData.pages.filter((p) => p.metaDescription && p.metaDescription.length > 160);
  if (longMetaPages.length > 0) {
    issues.push({
      severity: 'low',
      issue: `${longMetaPages.length} pages have meta descriptions that are too long`,
      impact: 'Meta descriptions get truncated in search results',
      fix: 'Keep meta descriptions between 50-160 characters',
      affectedPages: longMetaPages.map((p) => p.url).slice(0, 5),
    });
  }

  return issues;
};

/**
 * Get crawl statistics
 * @param {object} crawlData - Crawl data
 * @returns {object} Statistics
 */
const getCrawlStats = (crawlData) => {
  return {
    totalPages: crawlData.stats.totalPages,
    totalImages: crawlData.pages.reduce((acc, p) => acc + p.images.length, 0),
    imagesWithoutAlt: crawlData.pages.reduce((acc, p) => acc + p.images.filter((img) => !img.hasAlt).length, 0),
    pagesWithMissingMeta: crawlData.stats.pagesWithMissingMeta,
    pagesWithMissingH1: crawlData.stats.pagesWithMissingH1,
    brokenInternalLinks: crawlData.stats.brokenInternalLinks,
    internalLinks: crawlData.stats.internalLinksCount,
    externalLinks: crawlData.stats.externalLinksCount,
    totalIssues: crawlData.issues.length,
  };
};

module.exports = {
  crawlWebsite,
  analyzeForIssues,
  getCrawlStats,
};
