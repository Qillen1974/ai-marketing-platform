const { pool } = require('../config/database');
const {
  getBacklinks: getGSCBacklinks,
  getTopReferringDomains: getGSCTopDomains,
  getBacklinkStats: getGSCStats,
  checkAccess,
} = require('./googleSearchConsoleService');
const { matchBacklinksToKeywords } = require('./keywordSyncService');

/**
 * Main function to check backlinks for a website using Google Search Console
 * @param {number} websiteId - The website ID
 * @param {string} domain - The domain to check
 * @returns {object} - Backlink check results
 */
const checkBacklinksForWebsite = async (websiteId, domain) => {
  try {
    console.log(`🔗 Starting backlink check for website ${websiteId} (${domain})`);

    // Create new check record
    const checkResult = await pool.query(
      `INSERT INTO backlink_checks (website_id, check_status)
       VALUES ($1, 'in_progress')
       RETURNING id`,
      [websiteId]
    );
    const checkId = checkResult.rows[0].id;

    try {
      // Check if we have access to this domain in GSC
      console.log('📡 Fetching backlink data from Google Search Console...');

      // Get backlinks from Google Search Console
      const gscResult = await getGSCBacklinks(domain);

      if (gscResult.error) {
        console.log(`⚠️ GSC Error: ${gscResult.error}`);
        if (gscResult.suggestion) {
          console.log(`💡 Suggestion: ${gscResult.suggestion}`);
        }

        // Update check with error
        await pool.query(
          `UPDATE backlink_checks SET check_status = 'failed', error_message = $1 WHERE id = $2`,
          [gscResult.error, checkId]
        );

        throw new Error(gscResult.error);
      }

      const stats = gscResult.stats;
      const backlinksData = gscResult.backlinks || [];
      const topDomains = gscResult.externalLinks || [];

      console.log(`📊 GSC returned: ${backlinksData.length} backlinks from ${stats.totalReferringDomains} domains`);

      // Convert GSC backlinks to our format
      const formattedBacklinks = backlinksData.map(bl => ({
        referring_page: bl.referringDomain,
        source_url: bl.referringDomain,
        target_url: bl.targetUrl || `https://${domain}`,
        anchor: bl.anchorText,
        dofollow: bl.isDofollow !== false,
        link_type: 'dofollow',
      }));

      // Process backlinks and save to database
      const { newCount, existingCount, backlinkIds } = await processBacklinkData(
        websiteId,
        checkId,
        formattedBacklinks
      );

      // Mark backlinks not found in current check as lost
      const lostCount = await markLostBacklinks(websiteId, checkId, backlinkIds);

      // Calculate and save metrics
      await calculateBacklinkMetrics(websiteId, checkId, {
        stats,
        topDomains: topDomains.slice(0, 10) || [],
        anchorTexts: [], // GSC doesn't provide anchor text data
        newCount,
        lostCount,
      });

      // Update check status
      await pool.query(
        `UPDATE backlink_checks
         SET check_status = 'completed',
             new_backlinks_count = $1,
             lost_backlinks_count = $2
         WHERE id = $3`,
        [newCount, lostCount, checkId]
      );

      console.log(`✅ Backlink check completed: ${newCount} new, ${lostCount} lost`);

      // Match backlinks to campaign keywords for SEO Hub
      try {
        await matchBacklinksToKeywords(websiteId);
        console.log('✅ Backlinks matched to keywords');
      } catch (matchError) {
        console.error('⚠️ Backlink-keyword matching failed (non-blocking):', matchError.message);
      }

      // Get updated backlinks for response
      const backlinksResult = await pool.query(
        `SELECT * FROM backlinks
         WHERE website_id = $1 AND status = 'active'
         ORDER BY last_seen_date DESC
         LIMIT 50`,
        [websiteId]
      );

      return {
        checkId,
        totalBacklinks: backlinkIds.length,
        newBacklinks: newCount,
        lostBacklinks: lostCount,
        referringDomains: stats.totalReferringDomains || topDomains.length || 0,
        backlinks: backlinksResult.rows,
        source: 'Google Search Console',
      };
    } catch (error) {
      // Update check record with error
      await pool.query(
        `UPDATE backlink_checks
         SET check_status = 'failed',
             error_message = $1
         WHERE id = $2`,
        [error.message, checkId]
      );
      throw error;
    }
  } catch (error) {
    console.error('❌ Error checking backlinks:', error);
    throw error;
  }
};

/**
 * Process backlink data from API and save to database
 * @param {number} websiteId - The website ID
 * @param {number} checkId - The check ID
 * @param {array} apiBacklinks - Backlinks from SE Ranking API
 * @returns {object} - Counts of new and existing backlinks
 */
const processBacklinkData = async (websiteId, checkId, apiBacklinks) => {
  let newCount = 0;
  let existingCount = 0;
  const backlinkIds = [];

  console.log(`🔄 Processing ${apiBacklinks.length} backlinks...`);

  for (const backlink of apiBacklinks) {
    try {
      // Normalize domains and URLs
      const referringUrl = backlink.referring_page || backlink.source_url || '';
      const referringDomain = extractDomain(referringUrl);
      const targetUrl = backlink.target_url || backlink.destination_url || '';
      const targetPage = backlink.target_page || '';
      const anchorText = backlink.anchor || backlink.anchor_text || null;
      const linkType = backlink.link_type || (backlink.dofollow ? 'dofollow' : 'nofollow');
      const isDofollow = backlink.dofollow !== false && linkType === 'dofollow';

      // Skip if no valid referring URL
      if (!referringUrl || !referringDomain) {
        continue;
      }

      // Check if backlink already exists
      const existingResult = await pool.query(
        `SELECT id FROM backlinks
         WHERE website_id = $1 AND referring_url = $2 AND target_url = $3`,
        [websiteId, referringUrl, targetUrl || referringUrl]
      );

      if (existingResult.rows.length > 0) {
        // Update existing backlink
        const backlinkId = existingResult.rows[0].id;
        await pool.query(
          `UPDATE backlinks
           SET last_seen_date = NOW(),
               status = 'active',
               backlink_check_id = $1,
               anchor_text = COALESCE($2, anchor_text),
               link_type = $3,
               is_dofollow = $4,
               inlink_rank = $5,
               domain_authority = $6,
               updated_at = NOW()
           WHERE id = $7`,
          [
            checkId,
            anchorText,
            linkType,
            isDofollow,
            backlink.inlink_rank || null,
            backlink.domain_rank || backlink.domain_authority || null,
            backlinkId,
          ]
        );
        existingCount++;
        backlinkIds.push(backlinkId);
      } else {
        // Insert new backlink
        const insertResult = await pool.query(
          `INSERT INTO backlinks (
            website_id, backlink_check_id, referring_url, referring_domain,
            target_url, target_page, anchor_text, link_type, is_dofollow,
            inlink_rank, domain_authority, backlink_data, status,
            first_found_date, last_seen_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW(), NOW())
          ON CONFLICT (website_id, referring_url, target_url)
          DO UPDATE SET
            last_seen_date = NOW(),
            status = 'active',
            backlink_check_id = $2,
            anchor_text = COALESCE($7, backlinks.anchor_text),
            link_type = $8,
            is_dofollow = $9,
            updated_at = NOW()
          RETURNING id`,
          [
            websiteId,
            checkId,
            referringUrl,
            referringDomain,
            targetUrl || referringUrl,
            targetPage,
            anchorText,
            linkType,
            isDofollow,
            backlink.inlink_rank || null,
            backlink.domain_rank || backlink.domain_authority || null,
            JSON.stringify(backlink),
          ]
        );
        newCount++;
        backlinkIds.push(insertResult.rows[0].id);
      }
    } catch (error) {
      console.error('Error processing backlink:', error.message);
      // Continue processing other backlinks
    }
  }

  console.log(`✨ Processed: ${newCount} new, ${existingCount} existing`);

  return { newCount, existingCount, backlinkIds };
};

/**
 * Mark backlinks not in current check as lost
 * @param {number} websiteId - The website ID
 * @param {number} checkId - The check ID
 * @param {array} currentBacklinkIds - IDs of backlinks found in current check
 * @returns {number} - Count of lost backlinks
 */
const markLostBacklinks = async (websiteId, checkId, currentBacklinkIds) => {
  try {
    const result = await pool.query(
      `UPDATE backlinks
       SET status = 'lost',
           updated_at = NOW()
       WHERE website_id = $1
         AND status = 'active'
         AND (backlink_check_id IS NULL OR backlink_check_id != $2)
         AND id NOT IN (${currentBacklinkIds.length > 0 ? currentBacklinkIds.join(',') : '0'})
       RETURNING id`,
      [websiteId, checkId]
    );

    const lostCount = result.rows.length;
    if (lostCount > 0) {
      console.log(`📉 Marked ${lostCount} backlinks as lost`);
    }

    return lostCount;
  } catch (error) {
    console.error('Error marking lost backlinks:', error);
    return 0;
  }
};

/**
 * Calculate and save backlink metrics
 * @param {number} websiteId - The website ID
 * @param {number} checkId - The check ID
 * @param {object} data - Data containing stats, topDomains, anchorTexts, etc.
 */
const calculateBacklinkMetrics = async (websiteId, checkId, data) => {
  try {
    const { stats, topDomains, anchorTexts, newCount, lostCount } = data;

    // Get counts from database
    const countsResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active') as total_backlinks,
         COUNT(DISTINCT referring_domain) FILTER (WHERE status = 'active') as total_referring_domains,
         COUNT(*) FILTER (WHERE is_dofollow = true AND status = 'active') as dofollow_count,
         COUNT(*) FILTER (WHERE is_dofollow = false AND status = 'active') as nofollow_count,
         AVG(domain_authority) FILTER (WHERE domain_authority IS NOT NULL AND status = 'active') as avg_domain_authority
       FROM backlinks
       WHERE website_id = $1`,
      [websiteId]
    );

    const counts = countsResult.rows[0];

    // Update check record with metrics
    await pool.query(
      `UPDATE backlink_checks
       SET total_backlinks = $1,
           total_referring_domains = $2,
           dofollow_count = $3,
           nofollow_count = $4,
           average_domain_authority = $5,
           top_referring_domains = $6,
           anchor_text_distribution = $7,
           api_response_data = $8
       WHERE id = $9`,
      [
        parseInt(counts.total_backlinks),
        parseInt(counts.total_referring_domains),
        parseInt(counts.dofollow_count),
        parseInt(counts.nofollow_count),
        counts.avg_domain_authority,
        JSON.stringify(topDomains.slice(0, 10)),
        JSON.stringify(anchorTexts.slice(0, 20)),
        JSON.stringify({ stats, topDomainsCount: topDomains.length }),
        checkId,
      ]
    );

    console.log(`📈 Metrics saved: ${counts.total_backlinks} total, ${counts.total_referring_domains} domains`);
  } catch (error) {
    console.error('Error calculating metrics:', error);
  }
};

/**
 * Get latest backlinks for a website with pagination and filters
 * @param {number} websiteId - The website ID
 * @param {number} limit - Number of results
 * @param {number} offset - Pagination offset
 * @param {object} filters - Filters (status, linkType)
 * @returns {object} - Backlinks and total count
 */
const getLatestBacklinks = async (websiteId, limit = 50, offset = 0, filters = {}) => {
  try {
    const { status = 'active', linkType = 'all' } = filters;

    let query = `SELECT * FROM backlinks WHERE website_id = $1`;
    const params = [websiteId];
    let paramIndex = 2;

    // Apply filters
    if (status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (linkType === 'dofollow') {
      query += ` AND is_dofollow = true`;
    } else if (linkType === 'nofollow') {
      query += ` AND is_dofollow = false`;
    }

    query += ` ORDER BY last_seen_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM backlinks WHERE website_id = $1`;
    const countParams = [websiteId];
    let countParamIndex = 2;

    if (status !== 'all') {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (linkType === 'dofollow') {
      countQuery += ` AND is_dofollow = true`;
    } else if (linkType === 'nofollow') {
      countQuery += ` AND is_dofollow = false`;
    }

    const countResult = await pool.query(countQuery, countParams);

    return {
      backlinks: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    };
  } catch (error) {
    console.error('Error getting latest backlinks:', error);
    throw error;
  }
};

/**
 * Get backlink metrics for dashboard
 * @param {number} websiteId - The website ID
 * @returns {object} - Backlink metrics
 */
const getBacklinkMetrics = async (websiteId) => {
  try {
    // Get current metrics
    const metricsResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active') as total_backlinks,
         COUNT(DISTINCT referring_domain) FILTER (WHERE status = 'active') as total_referring_domains,
         COUNT(*) FILTER (WHERE is_dofollow = true AND status = 'active') as dofollow_count,
         COUNT(*) FILTER (WHERE is_dofollow = false AND status = 'active') as nofollow_count,
         AVG(domain_authority) FILTER (WHERE domain_authority IS NOT NULL AND status = 'active') as avg_domain_authority
       FROM backlinks
       WHERE website_id = $1`,
      [websiteId]
    );

    const metrics = metricsResult.rows[0];

    // Get new backlinks this month
    const newThisMonthResult = await pool.query(
      `SELECT COUNT(*) as new_this_month
       FROM backlinks
       WHERE website_id = $1
         AND status = 'active'
         AND first_found_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [websiteId]
    );

    // Get top referring domains
    const topDomainsResult = await pool.query(
      `SELECT referring_domain, COUNT(*) as backlinks_count
       FROM backlinks
       WHERE website_id = $1 AND status = 'active'
       GROUP BY referring_domain
       ORDER BY backlinks_count DESC
       LIMIT 10`,
      [websiteId]
    );

    const totalBacklinks = parseInt(metrics.total_backlinks);
    const dofollowCount = parseInt(metrics.dofollow_count);
    const dofollowPercentage = totalBacklinks > 0 ? (dofollowCount / totalBacklinks) * 100 : 0;

    return {
      totalBacklinks,
      newThisMonth: parseInt(newThisMonthResult.rows[0].new_this_month),
      totalReferringDomains: parseInt(metrics.total_referring_domains),
      dofollowPercentage,
      averageDomainAuthority: metrics.avg_domain_authority ? parseFloat(metrics.avg_domain_authority).toFixed(1) : null,
      topReferringDomains: topDomainsResult.rows,
    };
  } catch (error) {
    console.error('Error getting backlink metrics:', error);
    throw error;
  }
};

/**
 * Get backlink history for trend visualization
 * @param {number} websiteId - The website ID
 * @param {number} days - Number of days to look back
 * @returns {array} - Historical backlink data
 */
const getBacklinkHistory = async (websiteId, days = 30) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         check_date,
         check_status,
         total_backlinks,
         new_backlinks_count,
         lost_backlinks_count,
         total_referring_domains,
         dofollow_count,
         nofollow_count
       FROM backlink_checks
       WHERE website_id = $1
         AND check_date >= NOW() - INTERVAL '${days} days'
         AND check_status = 'completed'
       ORDER BY check_date DESC`,
      [websiteId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting backlink history:', error);
    throw error;
  }
};

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} - Extracted domain
 */
const extractDomain = (url) => {
  try {
    if (!url) return '';

    // Remove protocol
    let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');

    // Get the domain part (before first /)
    domain = domain.split('/')[0];

    return domain;
  } catch (error) {
    return '';
  }
};

module.exports = {
  checkBacklinksForWebsite,
  processBacklinkData,
  markLostBacklinks,
  calculateBacklinkMetrics,
  getLatestBacklinks,
  getBacklinkMetrics,
  getBacklinkHistory,
};
