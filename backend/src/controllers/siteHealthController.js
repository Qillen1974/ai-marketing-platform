const { pool } = require('../config/database');
const seRankingApi = require('../services/seRankingApiService');

// ============================================
// SITE HEALTH MONITORING & AUDITS
// ============================================

/**
 * Run a comprehensive website health audit
 * Uses SE Ranking API's 115+ checks
 */
const runSiteHealthAudit = async (req, res) => {
  try {
    const { websiteId, domain } = req.body;

    console.log(`📥 Audit request received:`, { websiteId, domain, body: req.body });
    console.log(`Domain validation: domain="${domain}", isValid=${domain ? seRankingApi.isValidDomain(domain) : 'N/A'}`);

    if (!domain || !seRankingApi.isValidDomain(domain)) {
      console.log(`❌ Domain validation failed for: "${domain}"`);
      return res.status(400).json({ error: 'Invalid domain', receivedDomain: domain });
    }

    console.log(`🔧 Starting site health audit for ${domain}`);

    // Start the audit with SE Ranking API
    const auditJob = await seRankingApi.startWebsiteAudit(domain, {
      crawlStandard: true,
      crawlJavaScript: false, // Set to true for SPAs
    });

    if (!auditJob) {
      return res.status(500).json({ error: 'Failed to start audit with SE Ranking' });
    }

    // Return job status immediately - audit runs async
    res.json({
      message: 'Audit started',
      jobId: auditJob.jobId,
      estimatedTime: '5-30 minutes depending on site size',
      status: 'processing',
    });

    // In the background, you could set up a webhook or polling mechanism
    // to get results when the audit completes
  } catch (error) {
    console.error('❌ Error running site health audit:', error.message);
    res.status(500).json({ error: 'Failed to run audit' });
  }
};

/**
 * Get audit status and poll for results
 */
const getAuditStatus = async (req, res) => {
  try {
    const { domain, jobId } = req.query;

    if (!domain || !jobId) {
      return res.status(400).json({ error: 'Domain and job ID required' });
    }

    const status = await seRankingApi.getAuditStatus(domain, jobId);

    if (!status) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('❌ Error getting audit status:', error.message);
    res.status(500).json({ error: 'Failed to get audit status' });
  }
};

/**
 * Get completed audit report and save health metrics
 */
const getAuditReport = async (req, res) => {
  try {
    const { websiteId, domain } = req.body;

    if (!domain || !websiteId) {
      return res.status(400).json({ error: 'Domain and website ID required' });
    }

    console.log(`📋 Fetching audit report for ${domain}`);

    // Get the audit report from SE Ranking
    const report = await seRankingApi.getAuditReport(domain);

    if (!report) {
      return res.status(404).json({ error: `No audit report found for ${domain}` });
    }

    // Calculate health score (0-100)
    const healthScore = calculateHealthScore(report);

    // Categorize issues
    const issueSummary = categorizeIssues(report.issues || []);

    // Get previous score for trend
    const previousAudit = await pool.query(
      `SELECT health_score FROM site_health_audits
       WHERE website_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [websiteId]
    );

    const previousScore = previousAudit.rows[0]?.health_score || null;

    // Save to database
    const auditResult = await pool.query(
      `INSERT INTO site_health_audits (
        website_id, health_score, critical_issues, high_issues,
        medium_issues, low_issues, total_issues,
        previous_score, issue_summary, audit_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        websiteId,
        healthScore,
        issueSummary.critical,
        issueSummary.high,
        issueSummary.medium,
        issueSummary.low,
        issueSummary.total,
        previousScore,
        JSON.stringify(issueSummary),
        JSON.stringify(report),
      ]
    );

    // Update website's last audit date
    await pool.query(
      `UPDATE websites SET last_audit_date = NOW() WHERE id = $1`,
      [websiteId]
    );

    console.log(`✅ Audit report saved with health score: ${healthScore}`);

    res.json({
      auditId: auditResult.rows[0].id,
      domain,
      healthScore,
      previousScore,
      scoreChange: previousScore ? healthScore - previousScore : null,
      issueSummary,
      topIssues: report.issues?.slice(0, 10) || [],
      fullReport: report,
    });
  } catch (error) {
    console.error('❌ Error getting audit report:', error.message);
    res.status(500).json({ error: 'Failed to get audit report' });
  }
};

/**
 * Get site health dashboard (latest audit + trends)
 */
const getSiteHealthDashboard = async (req, res) => {
  try {
    const { websiteId } = req.params;

    // Get latest audit
    const latestAudit = await pool.query(
      `SELECT * FROM site_health_audits
       WHERE website_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [websiteId]
    );

    if (latestAudit.rows.length === 0) {
      return res.status(404).json({ error: 'No audit found for this website' });
    }

    const audit = latestAudit.rows[0];

    // Get audit history (last 6 audits for trend)
    const auditHistory = await pool.query(
      `SELECT health_score, created_at FROM site_health_audits
       WHERE website_id = $1
       ORDER BY created_at DESC
       LIMIT 6`,
      [websiteId]
    );

    // Get quick wins report
    const quickWins = await pool.query(
      `SELECT * FROM quick_wins_reports
       WHERE website_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [websiteId]
    );

    res.json({
      currentHealth: {
        score: audit.health_score,
        criticalIssues: audit.critical_issues,
        highIssues: audit.high_issues,
        mediumIssues: audit.medium_issues,
        lowIssues: audit.low_issues,
        totalIssues: audit.total_issues,
        issueSummary: audit.issue_summary,
        lastAuditDate: audit.created_at,
      },
      trend: {
        previousScore: audit.previous_score,
        scoreChange: audit.previous_score ? audit.health_score - audit.previous_score : null,
        direction: audit.previous_score
          ? audit.health_score > audit.previous_score
            ? 'improving'
            : 'declining'
          : 'new',
        history: auditHistory.rows.map((row) => ({
          score: row.health_score,
          date: row.created_at,
        })),
      },
      quickWins: quickWins.rows[0] || null,
    });
  } catch (error) {
    console.error('❌ Error getting health dashboard:', error.message);
    res.status(500).json({ error: 'Failed to get health dashboard' });
  }
};

// ============================================
// QUICK WINS ANALYSIS
// ============================================

/**
 * Generate quick wins recommendations based on audit issues
 * Identifies easy fixes with high impact
 */
const generateQuickWins = async (req, res) => {
  try {
    const { websiteId, auditId } = req.body;

    if (!auditId) {
      return res.status(400).json({ error: 'Audit ID required' });
    }

    console.log(`💡 Generating quick wins for audit ${auditId}`);

    // Get the audit data
    const auditResult = await pool.query(
      `SELECT * FROM site_health_audits WHERE id = $1 AND website_id = $2`,
      [auditId, websiteId]
    );

    if (auditResult.rows.length === 0) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const audit = auditResult.rows[0];
    const auditData = audit.audit_data;

    // Extract quick wins from audit issues
    const quickWins = identifyQuickWins(auditData.issues || []);

    // Sort by impact and effort
    const prioritizedWins = quickWins.sort((a, b) => {
      // Priority = (impact score) / (effort score)
      const scoreA = (a.impactScore || 10) / (a.effortScore || 5);
      const scoreB = (b.impactScore || 10) / (b.effortScore || 5);
      return scoreB - scoreA;
    });

    // Calculate total potential impact
    const totalImpactScore = prioritizedWins.reduce((sum, w) => sum + (w.impactScore || 0), 0);

    // Save quick wins report
    const report = await pool.query(
      `INSERT INTO quick_wins_reports (
        website_id, audit_id, quick_wins_data, total_potential_impact_score
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [websiteId, auditId, JSON.stringify(prioritizedWins), totalImpactScore]
    );

    console.log(`✅ Generated ${prioritizedWins.length} quick wins`);

    res.json({
      reportId: report.rows[0].id,
      quickWinsCount: prioritizedWins.length,
      totalPotentialImpact: totalImpactScore,
      topQuickWins: prioritizedWins.slice(0, 10).map((win) => ({
        title: win.title,
        description: win.description,
        issue: win.issue,
        severity: win.severity,
        impactScore: win.impactScore,
        effortScore: win.effortScore,
        estimatedTimeToFix: win.estimatedTimeToFix,
        steps: win.steps,
        resources: win.resources,
      })),
      allQuickWins: prioritizedWins,
    });
  } catch (error) {
    console.error('❌ Error generating quick wins:', error.message);
    res.status(500).json({ error: 'Failed to generate quick wins' });
  }
};

/**
 * Get saved quick wins report
 */
const getQuickWinsReport = async (req, res) => {
  try {
    const { websiteId } = req.params;

    const report = await pool.query(
      `SELECT * FROM quick_wins_reports
       WHERE website_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [websiteId]
    );

    if (report.rows.length === 0) {
      return res.status(404).json({ error: 'No quick wins report found' });
    }

    res.json(report.rows[0]);
  } catch (error) {
    console.error('❌ Error getting quick wins report:', error.message);
    res.status(500).json({ error: 'Failed to get quick wins report' });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate overall health score from audit data
 * Formula: (total_issues_fixed / total_possible_issues) * 100
 */
const calculateHealthScore = (auditData) => {
  if (!auditData) return 0;

  // If API returns a score directly
  if (auditData.healthScore) {
    return auditData.healthScore;
  }

  // Otherwise calculate based on issues
  const issues = auditData.issues || [];
  const weights = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };

  let totalIssueWeight = 0;
  for (const issue of issues) {
    totalIssueWeight += weights[issue.severity] || 1;
  }

  // Score: 100 - (min(100, issue_weight))
  return Math.max(0, 100 - Math.min(100, totalIssueWeight));
};

/**
 * Categorize issues by severity
 */
const categorizeIssues = (issues = []) => {
  const categories = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: issues.length,
  };

  for (const issue of issues) {
    categories[issue.severity] = (categories[issue.severity] || 0) + 1;
  }

  return categories;
};

/**
 * Identify quick wins from audit issues
 * Quick wins: Easy fixes with high impact
 */
const identifyQuickWins = (issues = []) => {
  const quickWinsMap = {
    // Missing meta descriptions - easy fix, impacts CTR
    'missing_meta_description': {
      title: 'Add Missing Meta Descriptions',
      description: 'Meta descriptions improve click-through rates in search results',
      impactScore: 8,
      effortScore: 2,
      estimatedTimeToFix: '1-2 hours',
      steps: [
        'Go to pages missing meta descriptions',
        'Add unique, compelling 150-160 character descriptions',
        'Include target keywords naturally',
        'Test in Google Search Console',
      ],
      resources: ['https://moz.com/learn/seo/meta-description', 'Google Search Console'],
    },
    // Missing H1 tags
    'missing_h1': {
      title: 'Add Missing H1 Tags',
      description: 'H1 tags help search engines understand page content',
      impactScore: 7,
      effortScore: 2,
      estimatedTimeToFix: '30 minutes',
      steps: [
        'Each page should have exactly one H1 tag',
        'Make it descriptive and keyword-relevant',
        'Don\'t hide it with CSS',
      ],
      resources: ['https://moz.com/learn/seo/heading-tag'],
    },
    // Missing alt text on images
    'missing_alt_text': {
      title: 'Add Alt Text to Images',
      description: 'Alt text improves accessibility and helps images rank in image search',
      impactScore: 6,
      effortScore: 3,
      estimatedTimeToFix: '2-3 hours',
      steps: [
        'Identify images without alt text',
        'Write descriptive alt text (100-125 characters)',
        'Include keywords naturally',
        'Test with screen readers',
      ],
      resources: ['https://webaim.org/articles/alttext/'],
    },
    // Broken internal links
    'broken_internal_links': {
      title: 'Fix Broken Internal Links',
      description: 'Broken links hurt user experience and crawlability',
      impactScore: 8,
      effortScore: 3,
      estimatedTimeToFix: '1-2 hours',
      steps: [
        'Use audit report to find broken links',
        'Update links to correct URLs',
        'Or delete pages that no longer exist',
        'Test links after changes',
      ],
      resources: ['Search Console Coverage Report'],
    },
    // Duplicate content
    'duplicate_content': {
      title: 'Consolidate Duplicate Content',
      description: 'Duplicate content splits ranking power and confuses search engines',
      impactScore: 9,
      effortScore: 4,
      estimatedTimeToFix: '3-4 hours',
      steps: [
        'Identify duplicate pages',
        'Choose canonical version',
        'Use 301 redirect or canonical tag',
        'Monitor Search Console for consolidation',
      ],
      resources: ['https://moz.com/blog/canonical-url-guide'],
    },
    // Large images not optimized
    'unoptimized_images': {
      title: 'Optimize Image Sizes',
      description: 'Large images slow down pages and hurt Core Web Vitals',
      impactScore: 7,
      effortScore: 3,
      estimatedTimeToFix: '2-3 hours',
      steps: [
        'Use WebP format for modern browsers',
        'Implement lazy loading',
        'Compress images with tools like TinyPNG',
        'Use responsive images',
      ],
      resources: ['https://web.dev/optimize-images/'],
    },
    // Missing robots.txt
    'missing_robots_txt': {
      title: 'Create robots.txt File',
      description: 'robots.txt guides search engines on what to crawl',
      impactScore: 5,
      effortScore: 1,
      estimatedTimeToFix: '30 minutes',
      steps: [
        'Create robots.txt in root directory',
        'Allow crawling of important sections',
        'Block internal search results if needed',
        'Submit to Search Console',
      ],
      resources: ['https://moz.com/learn/seo/robotstxt'],
    },
  };

  const wins = [];

  for (const issue of issues) {
    // Map issue type to quick win
    const issueType = issue.type || issue.name || '';
    if (quickWinsMap[issueType]) {
      wins.push({
        ...quickWinsMap[issueType],
        issue: issue,
        severity: issue.severity,
      });
    }
  }

  // If no specific mapping, create generic entry
  if (wins.length === 0 && issues.length > 0) {
    return issues.slice(0, 10).map((issue) => ({
      title: issue.title || 'Fix Issue',
      description: issue.description || 'Resolve this SEO issue',
      impactScore: 5,
      effortScore: 3,
      estimatedTimeToFix: 'Varies',
      steps: [issue.recommendations || 'Follow the issue description'],
      resources: [],
      issue,
      severity: issue.severity,
    }));
  }

  return wins;
};

module.exports = {
  runSiteHealthAudit,
  getAuditStatus,
  getAuditReport,
  getSiteHealthDashboard,
  generateQuickWins,
  getQuickWinsReport,
};
