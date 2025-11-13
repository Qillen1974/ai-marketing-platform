const { pool } = require('../config/database');
const {
  verifyBacklink,
  checkAllBacklinks,
  getBacklinkHealthSummary,
  calculateBacklinkHealth,
} = require('../services/monitoringService');

/**
 * Add an acquired backlink
 */
const addAcquiredBacklink = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { backlinkUrl, anchorText, opportunityId } = req.body;

    if (!backlinkUrl) {
      return res.status(400).json({ error: 'Backlink URL is required' });
    }

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Extract domain from backlink URL
    let referringDomain = '';
    try {
      referringDomain = new URL(backlinkUrl).hostname;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid backlink URL' });
    }

    console.log(`🔗 Adding acquired backlink from ${referringDomain}...`);

    // Verify the backlink exists
    const verification = await verifyBacklink(backlinkUrl, anchorText);

    // Save acquired backlink
    const result = await pool.query(
      `INSERT INTO acquired_backlinks (website_id, opportunity_id, backlink_url,
                                       anchor_text, referring_domain, is_active, verified_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, backlink_url, referring_domain, is_active, verified_date`,
      [websiteId, opportunityId || null, backlinkUrl, anchorText, referringDomain, verification.isLive]
    );

    const backlink = result.rows[0];

    // Save verification result
    if (verification.statusCode) {
      await pool.query(
        `INSERT INTO backlink_checks (acquired_backlink_id, is_live, status_code, anchor_text, check_date)
         VALUES ($1, $2, $3, $4, NOW())`,
        [backlink.id, verification.isLive, verification.statusCode, anchorText]
      );
    }

    // Update opportunity status if linked
    if (opportunityId) {
      await pool.query(
        'UPDATE backlink_opportunities SET status = $1, updated_at = NOW() WHERE id = $2',
        ['secured', opportunityId]
      );
    }

    console.log(`✅ Backlink added (ID: ${backlink.id}, Active: ${backlink.is_active})`);

    res.status(201).json({
      message: 'Backlink added and verified',
      backlink: {
        id: backlink.id,
        url: backlink.backlink_url,
        referringDomain: backlink.referring_domain,
        isActive: backlink.is_active,
        verifiedDate: backlink.verified_date,
      },
    });
  } catch (error) {
    console.error('Add backlink error:', error);
    res.status(500).json({ error: 'Failed to add backlink' });
  }
};

/**
 * Get acquired backlinks for a website
 */
const getAcquiredBacklinks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get backlinks
    const result = await pool.query(
      `SELECT id, backlink_url, anchor_text, referring_domain, domain_authority,
              is_active, verified_date, last_checked, created_at
       FROM acquired_backlinks
       WHERE website_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [websiteId, limit, offset]
    );

    const backlinks = result.rows.map((bl) => ({
      id: bl.id,
      backlinkUrl: bl.backlink_url,
      anchorText: bl.anchor_text,
      referringDomain: bl.referring_domain,
      domainAuthority: bl.domain_authority,
      isActive: bl.is_active,
      verifiedDate: bl.verified_date,
      lastChecked: bl.last_checked,
      createdAt: bl.created_at,
    }));

    res.json({ backlinks });
  } catch (error) {
    console.error('Get backlinks error:', error);
    res.status(500).json({ error: 'Failed to fetch backlinks' });
  }
};

/**
 * Verify a specific backlink
 */
const verifyAcquiredBacklink = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, backlinkId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get backlink
    const backlinkResult = await pool.query(
      `SELECT id, backlink_url, anchor_text, referring_domain
       FROM acquired_backlinks
       WHERE id = $1 AND website_id = $2`,
      [backlinkId, websiteId]
    );

    if (backlinkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Backlink not found' });
    }

    const backlink = backlinkResult.rows[0];

    console.log(`🔍 Verifying backlink: ${backlink.backlink_url}`);

    // Verify the backlink
    const verification = await verifyBacklink(
      backlink.backlink_url,
      backlink.anchor_text,
      backlink.referring_domain
    );

    // Save verification result
    await pool.query(
      `INSERT INTO backlink_checks (acquired_backlink_id, is_live, status_code, check_date)
       VALUES ($1, $2, $3, NOW())`,
      [backlinkId, verification.isLive, verification.statusCode]
    );

    // Update backlink status
    await pool.query(
      `UPDATE acquired_backlinks
       SET is_active = $1, last_checked = NOW()
       WHERE id = $2`,
      [verification.isLive, backlinkId]
    );

    console.log(`✅ Verification complete - isLive: ${verification.isLive}`);

    res.json({
      message: 'Backlink verified',
      verification: {
        isLive: verification.isLive,
        statusCode: verification.statusCode,
        error: verification.error,
        checkedAt: verification.checkedAt,
      },
    });
  } catch (error) {
    console.error('Verify backlink error:', error);
    res.status(500).json({ error: 'Failed to verify backlink' });
  }
};

/**
 * Check all backlinks for a website
 */
const checkAllWebsiteBacklinks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get all backlinks
    const backlinksResult = await pool.query(
      `SELECT id, backlink_url, anchor_text, referring_domain
       FROM acquired_backlinks
       WHERE website_id = $1`,
      [websiteId]
    );

    if (backlinksResult.rows.length === 0) {
      return res.json({
        message: 'No backlinks to check',
        results: [],
      });
    }

    const backlinks = backlinksResult.rows;

    console.log(`🔗 Starting check for ${backlinks.length} backlinks...`);

    // Check all backlinks
    const results = await checkAllBacklinks(backlinks);

    // Save all verification results and update statuses
    for (const result of results) {
      await pool.query(
        `INSERT INTO backlink_checks (acquired_backlink_id, is_live, status_code, check_date)
         VALUES ($1, $2, $3, NOW())`,
        [result.id, result.isLive, result.statusCode]
      );

      await pool.query(
        `UPDATE acquired_backlinks
         SET is_active = $1, last_checked = NOW()
         WHERE id = $2`,
        [result.isLive, result.id]
      );
    }

    console.log(`✅ All backlinks checked and updated`);

    res.json({
      message: 'All backlinks checked',
      results,
    });
  } catch (error) {
    console.error('Check all backlinks error:', error);
    res.status(500).json({ error: 'Failed to check backlinks' });
  }
};

/**
 * Get backlink health summary
 */
const getBacklinkHealth = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get all backlinks
    const result = await pool.query(
      `SELECT id, backlink_url, anchor_text, referring_domain, domain_authority,
              is_active, verified_date, last_checked
       FROM acquired_backlinks
       WHERE website_id = $1`,
      [websiteId]
    );

    const backlinks = result.rows;

    if (backlinks.length === 0) {
      return res.json({
        message: 'No backlinks found',
        health: {
          totalBacklinks: 0,
          activeBacklinks: 0,
          brokenBacklinks: 0,
          activePercentage: 0,
          averageDomainAuthority: 0,
          averageHealth: 0,
          healthStatus: 'No Data',
        },
      });
    }

    // Calculate health summary
    const health = getBacklinkHealthSummary(backlinks);

    res.json({
      message: 'Backlink health summary',
      health,
    });
  } catch (error) {
    console.error('Get backlink health error:', error);
    res.status(500).json({ error: 'Failed to fetch backlink health' });
  }
};

module.exports = {
  addAcquiredBacklink,
  getAcquiredBacklinks,
  verifyAcquiredBacklink,
  checkAllWebsiteBacklinks,
  getBacklinkHealth,
};
