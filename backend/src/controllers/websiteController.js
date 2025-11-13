const { pool } = require('../config/database');

// Add a new website
const addWebsite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { domain, targetKeywords } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Check plan limits
    const userResult = await pool.query(
      'SELECT plan FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPlan = userResult.rows[0].plan;
    const websiteLimits = { free: 1, pro: 3, enterprise: -1 }; // -1 means unlimited

    if (websiteLimits[userPlan] !== -1) {
      const websiteCount = await pool.query(
        'SELECT COUNT(*) as count FROM websites WHERE user_id = $1',
        [userId]
      );

      if (parseInt(websiteCount.rows[0].count) >= websiteLimits[userPlan]) {
        return res.status(403).json({
          error: `Plan limit reached. Your ${userPlan} plan allows ${websiteLimits[userPlan]} website(s)`,
        });
      }
    }

    // Add website
    const result = await pool.query(
      `INSERT INTO websites (user_id, domain, target_keywords)
       VALUES ($1, $2, $3)
       RETURNING id, domain, target_keywords, created_at`,
      [userId, domain.toLowerCase(), targetKeywords || null]
    );

    const website = result.rows[0];

    res.status(201).json({
      message: 'Website added successfully',
      website: {
        id: website.id,
        domain: website.domain,
        targetKeywords: website.target_keywords,
        createdAt: website.created_at,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This domain is already added' });
    }
    console.error('Add website error:', error);
    res.status(500).json({ error: 'Failed to add website' });
  }
};

// Get all websites for a user
const getWebsites = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, domain, target_keywords, last_audit_date, monitoring_enabled, created_at
       FROM websites
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const websites = result.rows.map((w) => ({
      id: w.id,
      domain: w.domain,
      targetKeywords: w.target_keywords,
      lastAuditDate: w.last_audit_date,
      monitoringEnabled: w.monitoring_enabled,
      createdAt: w.created_at,
    }));

    res.json({ websites });
  } catch (error) {
    console.error('Get websites error:', error);
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
};

// Get a specific website
const getWebsite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    const result = await pool.query(
      `SELECT id, domain, target_keywords, last_audit_date, monitoring_enabled, created_at
       FROM websites
       WHERE id = $1 AND user_id = $2`,
      [websiteId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = result.rows[0];

    res.json({
      website: {
        id: website.id,
        domain: website.domain,
        targetKeywords: website.target_keywords,
        lastAuditDate: website.last_audit_date,
        monitoringEnabled: website.monitoring_enabled,
        createdAt: website.created_at,
      },
    });
  } catch (error) {
    console.error('Get website error:', error);
    res.status(500).json({ error: 'Failed to fetch website' });
  }
};

// Update website
const updateWebsite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { targetKeywords, monitoringEnabled } = req.body;

    const result = await pool.query(
      `UPDATE websites
       SET target_keywords = COALESCE($1, target_keywords),
           monitoring_enabled = COALESCE($2, monitoring_enabled),
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, domain, target_keywords, monitoring_enabled`,
      [targetKeywords || null, monitoringEnabled !== undefined ? monitoringEnabled : null, websiteId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = result.rows[0];

    res.json({
      message: 'Website updated successfully',
      website: {
        id: website.id,
        domain: website.domain,
        targetKeywords: website.target_keywords,
        monitoringEnabled: website.monitoring_enabled,
      },
    });
  } catch (error) {
    console.error('Update website error:', error);
    res.status(500).json({ error: 'Failed to update website' });
  }
};

// Delete website
const deleteWebsite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    const result = await pool.query(
      'DELETE FROM websites WHERE id = $1 AND user_id = $2 RETURNING id',
      [websiteId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    res.json({ message: 'Website deleted successfully' });
  } catch (error) {
    console.error('Delete website error:', error);
    res.status(500).json({ error: 'Failed to delete website' });
  }
};

module.exports = {
  addWebsite,
  getWebsites,
  getWebsite,
  updateWebsite,
  deleteWebsite,
};
