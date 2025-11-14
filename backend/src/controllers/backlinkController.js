const { pool } = require('../config/database');
const { discoverBacklinkOpportunities } = require('../services/backlinkService');
const { checkLimit, trackUsage } = require('../services/usageService');

// Discover backlink opportunities for a website
const discoverOpportunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { campaignName, campaignType } = req.body;

    // Verify website ownership and get website data
    const websiteResult = await pool.query(
      'SELECT domain, target_keywords FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // Get user plan and check quota
    const userResult = await pool.query(
      'SELECT plan FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    console.log(`👤 User ${userId} plan: ${user.plan}`);

    // Check if user has backlink discovery quota remaining
    const backlinkQuota = await checkLimit(userId, 'backlink_discovery', user.plan);
    if (backlinkQuota.hasExceeded && !backlinkQuota.isUnlimited) {
      return res.status(429).json({
        error: 'Monthly backlink discovery quota exceeded',
        quotaUsed: backlinkQuota.currentUsage,
        quotaLimit: backlinkQuota.limit,
        remaining: backlinkQuota.remaining,
        message: 'You have exceeded your monthly backlink discovery limit. Upgrade your plan or provide your own Serper API key.',
      });
    }

    console.log(`🔗 Starting backlink discovery for website: ${website.domain}`);

    // Parse target keywords
    const keywords = website.target_keywords
      ? website.target_keywords.split(',').map((k) => k.trim()).slice(0, 5)
      : ['digital marketing', 'seo', 'online marketing'];

    // Discover opportunities
    const opportunities = await discoverBacklinkOpportunities(website.domain, keywords);

    if (opportunities.length === 0) {
      return res.status(200).json({
        message: 'No backlink opportunities found at this time',
        opportunities: [],
      });
    }

    // Create campaign if campaign name provided
    let campaignId = null;
    if (campaignName) {
      const campaignResult = await pool.query(
        `INSERT INTO backlink_campaigns (website_id, campaign_name, campaign_type, target_backlinks)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [websiteId, campaignName, campaignType || 'mixed', opportunities.length]
      );
      campaignId = campaignResult.rows[0].id;
      console.log(`📋 Created campaign: ${campaignName} (ID: ${campaignId})`);
    }

    // Save opportunities to database
    const savedOpportunities = [];
    for (const opp of opportunities) {
      try {
        const result = await pool.query(
          `INSERT INTO backlink_opportunities (
            website_id, campaign_id, source_url, source_domain, domain_authority,
            page_authority, spam_score, opportunity_type, relevance_score,
            difficulty_score, contact_email, contact_method, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id, source_url, source_domain, domain_authority, opportunity_type,
                    relevance_score, difficulty_score, status`,
          [
            websiteId,
            campaignId,
            opp.source_url,
            opp.source_domain,
            opp.domain_authority,
            opp.page_authority,
            opp.spam_score,
            opp.opportunity_type,
            opp.relevance_score,
            opp.difficulty_score,
            opp.contact_email,
            opp.contact_method,
            'discovered',
          ]
        );

        savedOpportunities.push({
          id: result.rows[0].id,
          sourceUrl: result.rows[0].source_url,
          sourceDomain: result.rows[0].source_domain,
          domainAuthority: result.rows[0].domain_authority,
          opportunityType: result.rows[0].opportunity_type,
          relevanceScore: result.rows[0].relevance_score,
          difficultyScore: result.rows[0].difficulty_score,
          status: result.rows[0].status,
        });
      } catch (insertError) {
        // Skip if duplicate (already exists)
        if (insertError.code === '23505') {
          console.log(`Skipping duplicate opportunity: ${opp.source_domain}`);
        } else {
          throw insertError;
        }
      }
    }

    console.log(`✅ Saved ${savedOpportunities.length} opportunities to database`);

    // Track usage
    await trackUsage(userId, 'backlink_discovery', 1);

    // Get updated quota for response
    const updatedQuota = await checkLimit(userId, 'backlink_discovery', user.plan);

    res.json({
      message: `Discovered ${savedOpportunities.length} backlink opportunities`,
      campaignId: campaignId,
      opportunities: savedOpportunities,
      quotaRemaining: updatedQuota.remaining,
      quotaUsed: updatedQuota.currentUsage,
      quotaLimit: updatedQuota.limit,
    });
  } catch (error) {
    console.error('Discover opportunities error:', error);
    res.status(500).json({ error: 'Failed to discover backlink opportunities' });
  }
};

// Get all backlink opportunities for a website
const getOpportunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { status, type, difficulty, limit = 50, offset = 0 } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Build query with filters
    let query = `
      SELECT id, source_url, source_domain, domain_authority, page_authority,
             spam_score, opportunity_type, relevance_score, difficulty_score,
             contact_email, contact_method, status, notes, created_at, updated_at
      FROM backlink_opportunities
      WHERE website_id = $1
    `;
    const params = [websiteId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      query += ` AND opportunity_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Handle difficulty filter
    if (difficulty) {
      if (difficulty === 'easy') {
        query += ` AND difficulty_score <= $${paramIndex}`;
        params.push(35);
        paramIndex++;
      } else if (difficulty === 'medium') {
        query += ` AND difficulty_score BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(36, 65);
        paramIndex += 2;
      } else if (difficulty === 'difficult') {
        query += ` AND difficulty_score >= $${paramIndex}`;
        params.push(66);
        paramIndex++;
      }
    }

    query += ` ORDER BY domain_authority DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const opportunities = result.rows.map((opp) => ({
      id: opp.id,
      sourceUrl: opp.source_url,
      sourceDomain: opp.source_domain,
      domainAuthority: opp.domain_authority,
      pageAuthority: opp.page_authority,
      spamScore: opp.spam_score,
      opportunityType: opp.opportunity_type,
      relevanceScore: opp.relevance_score,
      difficultyScore: opp.difficulty_score,
      contactEmail: opp.contact_email,
      contactMethod: opp.contact_method,
      status: opp.status,
      notes: opp.notes,
      createdAt: opp.created_at,
      updatedAt: opp.updated_at,
    }));

    res.json({ opportunities });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
};

// Get a specific opportunity
const getOpportunity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, opportunityId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const result = await pool.query(
      `SELECT id, source_url, source_domain, domain_authority, page_authority,
              spam_score, opportunity_type, relevance_score, difficulty_score,
              contact_email, contact_method, status, notes, created_at
       FROM backlink_opportunities
       WHERE id = $1 AND website_id = $2`,
      [opportunityId, websiteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const opp = result.rows[0];

    res.json({
      opportunity: {
        id: opp.id,
        sourceUrl: opp.source_url,
        sourceDomain: opp.source_domain,
        domainAuthority: opp.domain_authority,
        pageAuthority: opp.page_authority,
        spamScore: opp.spam_score,
        opportunityType: opp.opportunity_type,
        relevanceScore: opp.relevance_score,
        difficultyScore: opp.difficulty_score,
        contactEmail: opp.contact_email,
        contactMethod: opp.contact_method,
        status: opp.status,
        notes: opp.notes,
        createdAt: opp.created_at,
      },
    });
  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
};

// Update opportunity (status, notes)
const updateOpportunity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, opportunityId } = req.params;
    const { status, notes } = req.body;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Update opportunity
    const result = await pool.query(
      `UPDATE backlink_opportunities
       SET status = COALESCE($1, status), notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $3 AND website_id = $4
       RETURNING id, status, notes`,
      [status || null, notes || null, opportunityId, websiteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json({
      message: 'Opportunity updated successfully',
      opportunity: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        notes: result.rows[0].notes,
      },
    });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
};

// Get campaign statistics
const getCampaignStats = async (req, res) => {
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

    // Get statistics
    const statsResult = await pool.query(
      `SELECT
        COUNT(*) as total_opportunities,
        SUM(CASE WHEN status = 'discovered' THEN 1 ELSE 0 END) as discovered,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'secured' THEN 1 ELSE 0 END) as secured,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        AVG(domain_authority) as avg_domain_authority,
        AVG(relevance_score) as avg_relevance
       FROM backlink_opportunities
       WHERE website_id = $1`,
      [websiteId]
    );

    const stats = statsResult.rows[0];

    res.json({
      stats: {
        totalOpportunities: parseInt(stats.total_opportunities) || 0,
        discovered: parseInt(stats.discovered) || 0,
        contacted: parseInt(stats.contacted) || 0,
        pending: parseInt(stats.pending) || 0,
        secured: parseInt(stats.secured) || 0,
        rejected: parseInt(stats.rejected) || 0,
        avgDomainAuthority: Math.round(stats.avg_domain_authority) || 0,
        avgRelevance: Math.round(stats.avg_relevance) || 0,
      },
    });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

module.exports = {
  discoverOpportunities,
  getOpportunities,
  getOpportunity,
  updateOpportunity,
  getCampaignStats,
};
