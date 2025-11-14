const { pool } = require('../config/database');
const { performSEOAudit, getKeywordResearch } = require('../services/seoService');
const { checkLimit, trackUsage } = require('../services/usageService');

// Run an SEO audit
const runAudit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT domain, target_keywords FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // Get user plan
    const userResult = await pool.query(
      'SELECT plan FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    console.log(`👤 User ${userId} plan: ${user.plan}`);

    // Check if user has audit quota remaining
    const auditQuota = await checkLimit(userId, 'audit', user.plan);
    if (auditQuota.hasExceeded && !auditQuota.isUnlimited) {
      return res.status(429).json({
        error: 'Monthly audit quota exceeded',
        quotaUsed: auditQuota.currentUsage,
        quotaLimit: auditQuota.limit,
        remaining: auditQuota.remaining,
        message: 'You have exceeded your monthly audit limit. Upgrade your plan or provide your own Google PageSpeed API key.',
      });
    }

    // Perform audit (includes keyword research via performSEOAudit)
    console.log(`🔍 Starting audit process for website ID: ${websiteId}, domain: ${website.domain}`);
    console.log(`📌 Target keywords: ${website.target_keywords || 'none'}`);
    const auditData = await performSEOAudit(website.domain, website.target_keywords);

    // Calculate overall score
    const overallScore = Math.round(
      (auditData.onPageScore + auditData.technicalScore + auditData.contentScore) / 3
    );

    // Save audit result to database
    const reportResult = await pool.query(
      `INSERT INTO seo_reports (website_id, on_page_score, technical_score, content_score, overall_score,
                               total_issues, critical_issues, recommendations, report_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, audit_date, overall_score`,
      [
        websiteId,
        auditData.onPageScore,
        auditData.technicalScore,
        auditData.contentScore,
        overallScore,
        auditData.issues.length,
        auditData.issues.filter((i) => i.severity === 'critical').length,
        JSON.stringify(auditData.recommendations),
        JSON.stringify(auditData),
      ]
    );

    const report = reportResult.rows[0];

    // Save individual issues
    for (const issue of auditData.issues) {
      await pool.query(
        `INSERT INTO audit_results (website_id, on_page_issues, technical_issues, content_recommendations, mobile_friendly, page_speed_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          websiteId,
          JSON.stringify([issue]),
          JSON.stringify([]),
          JSON.stringify(auditData.recommendations),
          auditData.mobileFriendly,
          auditData.pageSpeedScore,
        ]
      );
    }

    // Update last audit date
    await pool.query('UPDATE websites SET last_audit_date = NOW() WHERE id = $1', [websiteId]);

    // Save keywords from audit to database
    try {
      console.log('💾 Saving keywords to database...');
      if (auditData.keywordData && auditData.keywordData.length > 0) {
        for (const kw of auditData.keywordData) {
          await pool.query(
            `INSERT INTO keywords (website_id, keyword, search_volume, difficulty, current_position, trend)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (website_id, keyword) DO UPDATE
             SET search_volume = $3, difficulty = $4, current_position = $5, trend = $6, last_updated = NOW()`,
            [websiteId, kw.keyword, kw.searchVolume, kw.difficulty, kw.currentPosition, kw.trend]
          );
        }
        console.log(`✅ Saved ${auditData.keywordData.length} keywords to database`);
      }
    } catch (error) {
      console.error('Error saving keywords:', error);
      // Don't fail the entire audit if keyword saving fails
    }

    // Track usage
    await trackUsage(userId, 'audit', 1);

    // Get updated quota for response
    const updatedQuota = await checkLimit(userId, 'audit', user.plan);

    res.json({
      message: 'Audit completed successfully',
      report: {
        id: report.id,
        auditDate: report.audit_date,
        overallScore: report.overall_score,
        scores: {
          onPage: auditData.onPageScore,
          technical: auditData.technicalScore,
          content: auditData.contentScore,
        },
        issues: auditData.issues,
        recommendations: auditData.recommendations,
        mobileFriendly: auditData.mobileFriendly,
        pageSpeedScore: auditData.pageSpeedScore,
        ssl: auditData.ssl,
      },
      quotaRemaining: updatedQuota.remaining,
      quotaUsed: updatedQuota.currentUsage,
      quotaLimit: updatedQuota.limit,
    });
  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ error: 'Failed to run audit' });
  }
};

// Get audit history
const getAuditHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const result = await pool.query(
      `SELECT id, audit_date, on_page_score, technical_score, content_score, overall_score,
              total_issues, critical_issues
       FROM seo_reports
       WHERE website_id = $1
       ORDER BY audit_date DESC
       LIMIT $2 OFFSET $3`,
      [websiteId, limit, offset]
    );

    const reports = result.rows.map((r) => ({
      id: r.id,
      auditDate: r.audit_date,
      scores: {
        onPage: r.on_page_score,
        technical: r.technical_score,
        content: r.content_score,
        overall: r.overall_score,
      },
      totalIssues: r.total_issues,
      criticalIssues: r.critical_issues,
    }));

    res.json({ reports });
  } catch (error) {
    console.error('Get audit history error:', error);
    res.status(500).json({ error: 'Failed to fetch audit history' });
  }
};

// Get a specific audit report
const getAuditReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, reportId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const result = await pool.query(
      `SELECT id, audit_date, on_page_score, technical_score, content_score, overall_score,
              total_issues, critical_issues, recommendations, report_data
       FROM seo_reports
       WHERE id = $1 AND website_id = $2`,
      [reportId, websiteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];

    // Handle report_data - could be string or object depending on DB
    let reportData;
    if (typeof report.report_data === 'string') {
      reportData = JSON.parse(report.report_data);
    } else {
      reportData = report.report_data;
    }

    // Handle recommendations - could be string or object
    let recommendations;
    if (typeof report.recommendations === 'string') {
      recommendations = JSON.parse(report.recommendations);
    } else {
      recommendations = report.recommendations;
    }

    res.json({
      report: {
        id: report.id,
        auditDate: report.audit_date,
        overallScore: report.overall_score,
        scores: {
          onPage: report.on_page_score,
          technical: report.technical_score,
          content: report.content_score,
        },
        issues: reportData.issues || [],
        recommendations: recommendations,
        mobileFriendly: reportData.mobileFriendly,
        pageSpeedScore: reportData.pageSpeedScore,
        ssl: reportData.ssl,
        totalIssues: report.total_issues,
        criticalIssues: report.critical_issues,
        reportData: reportData,
      },
    });
  } catch (error) {
    console.error('Get audit report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

module.exports = {
  runAudit,
  getAuditHistory,
  getAuditReport,
};
