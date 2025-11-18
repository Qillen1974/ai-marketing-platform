const { pool } = require('../config/database');
const { discoverBacklinkOpportunities } = require('../services/backlinkService');
const { checkLimit, trackUsage } = require('../services/usageService');

// Discover backlink opportunities for a website
const discoverOpportunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { campaignName, campaignType, selectedKeywords } = req.body;

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

    // Use selected keywords if provided, otherwise use all target keywords
    let keywords = [];
    if (selectedKeywords && selectedKeywords.length > 0) {
      keywords = selectedKeywords;
      console.log(`📌 Using ${keywords.length} selected keywords for discovery`);
    } else if (website.target_keywords) {
      keywords = website.target_keywords.split(',').map((k) => k.trim());
      console.log(`📌 Using all ${keywords.length} target keywords for discovery`);
    } else {
      keywords = ['digital marketing', 'seo', 'online marketing'];
      console.log(`📌 Using default keywords for discovery`);
    }

    // IMPROVEMENT B: Get user's backlink discovery settings
    const settingsResult = await pool.query(
      `SELECT min_domain_authority, max_domain_authority, min_difficulty, max_difficulty
       FROM backlink_discovery_settings
       WHERE user_id = $1`,
      [userId]
    );

    let userSettings = null;
    if (settingsResult.rows.length > 0) {
      const settings = settingsResult.rows[0];
      userSettings = {
        minDomainAuthority: settings.min_domain_authority,
        maxDomainAuthority: settings.max_domain_authority,
        minDifficulty: settings.min_difficulty,
        maxDifficulty: settings.max_difficulty,
      };
      console.log(`⚙️  Using user backlink settings: DA ${userSettings.minDomainAuthority}-${userSettings.maxDomainAuthority}, Difficulty ${userSettings.minDifficulty}-${userSettings.maxDifficulty}`);
    } else {
      console.log(`⚙️  No user settings found, using defaults`);
    }

    // Discover opportunities with user settings
    const opportunities = await discoverBacklinkOpportunities(website.domain, keywords, campaignType, userSettings);

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
    console.log(`💾 Saving ${opportunities.length} opportunities for website_id=${websiteId}, campaign_id=${campaignId}`);

    for (const opp of opportunities) {
      try {
        console.log(`  → Saving: ${opp.source_domain} (DA: ${opp.domain_authority})`);

        const result = await pool.query(
          `INSERT INTO backlink_opportunities (
            website_id, campaign_id, source_url, source_domain, domain_authority,
            page_authority, spam_score, opportunity_type, relevance_score,
            difficulty_score, contact_email, contact_method, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (website_id, source_domain) DO UPDATE SET
            opportunity_type = EXCLUDED.opportunity_type,
            relevance_score = EXCLUDED.relevance_score,
            difficulty_score = EXCLUDED.difficulty_score,
            campaign_id = CASE WHEN backlink_opportunities.campaign_id IS NULL THEN EXCLUDED.campaign_id ELSE backlink_opportunities.campaign_id END,
            updated_at = NOW()
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
        console.log(`    ✅ Saved with ID: ${result.rows[0].id}`);
      } catch (insertError) {
        console.error(`Error saving opportunity ${opp.source_domain}:`, insertError.message);
        throw insertError;
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

    console.log(`📋 Fetching opportunities for website ${websiteId}, user ${userId}`);

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      console.log(`❌ Website ${websiteId} not found for user ${userId}`);
      return res.status(404).json({ error: 'Website not found' });
    }

    console.log(`✅ Website verified for user ${userId}`);

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

    console.log(`🔍 Query: ${query}`);
    console.log(`📊 Params: ${JSON.stringify(params)}`);

    const result = await pool.query(query, params);

    console.log(`📈 Found ${result.rows.length} opportunities in database`);

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

    console.log(`✅ Returning ${opportunities.length} opportunities to frontend`);
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

// Get user's backlink discovery settings
const getBacklinkSettings = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Try to get existing settings
    const result = await pool.query(
      `SELECT id, user_id, min_domain_authority, max_domain_authority,
              min_difficulty, max_difficulty, min_traffic,
              exclude_edu_gov, exclude_news_sites, created_at, updated_at
       FROM backlink_discovery_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      const settings = result.rows[0];
      return res.json({
        settings: {
          minDomainAuthority: settings.min_domain_authority,
          maxDomainAuthority: settings.max_domain_authority,
          minDifficulty: settings.min_difficulty,
          maxDifficulty: settings.max_difficulty,
          minTraffic: settings.min_traffic,
          excludeEduGov: settings.exclude_edu_gov,
          excludeNewsSites: settings.exclude_news_sites,
          createdAt: settings.created_at,
          updatedAt: settings.updated_at,
        },
      });
    }

    // Return default settings if none exist
    res.json({
      settings: {
        minDomainAuthority: 10,
        maxDomainAuthority: 60,
        minDifficulty: 20,
        maxDifficulty: 70,
        minTraffic: 0,
        excludeEduGov: false,
        excludeNewsSites: false,
      },
    });
  } catch (error) {
    console.error('Get backlink settings error:', error);
    res.status(500).json({ error: 'Failed to fetch backlink settings' });
  }
};

// Update user's backlink discovery settings
const updateBacklinkSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      minDomainAuthority,
      maxDomainAuthority,
      minDifficulty,
      maxDifficulty,
      minTraffic,
      excludeEduGov,
      excludeNewsSites,
    } = req.body;

    // Validate inputs
    if (!minDomainAuthority || !maxDomainAuthority || !minDifficulty || !maxDifficulty) {
      return res.status(400).json({
        error: 'Missing required fields: minDomainAuthority, maxDomainAuthority, minDifficulty, maxDifficulty',
      });
    }

    // Validate ranges
    if (maxDomainAuthority <= minDomainAuthority) {
      return res.status(400).json({
        error: 'Max Domain Authority must be greater than Min Domain Authority',
      });
    }

    if (maxDifficulty <= minDifficulty) {
      return res.status(400).json({
        error: 'Max Difficulty must be greater than Min Difficulty',
      });
    }

    // Validate value ranges
    if (minDomainAuthority < 1 || maxDomainAuthority > 100) {
      return res.status(400).json({
        error: 'Domain Authority values must be between 1 and 100',
      });
    }

    if (minDifficulty < 1 || maxDifficulty > 100) {
      return res.status(400).json({
        error: 'Difficulty values must be between 1 and 100',
      });
    }

    // Upsert settings (insert or update)
    const result = await pool.query(
      `INSERT INTO backlink_discovery_settings
       (user_id, min_domain_authority, max_domain_authority, min_difficulty, max_difficulty,
        min_traffic, exclude_edu_gov, exclude_news_sites, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
       min_domain_authority = $2,
       max_domain_authority = $3,
       min_difficulty = $4,
       max_difficulty = $5,
       min_traffic = $6,
       exclude_edu_gov = $7,
       exclude_news_sites = $8,
       updated_at = NOW()
       RETURNING min_domain_authority, max_domain_authority, min_difficulty, max_difficulty,
                 min_traffic, exclude_edu_gov, exclude_news_sites`,
      [
        userId,
        minDomainAuthority,
        maxDomainAuthority,
        minDifficulty,
        maxDifficulty,
        minTraffic || 0,
        excludeEduGov || false,
        excludeNewsSites || false,
      ]
    );

    const settings = result.rows[0];

    console.log(`⚙️  Updated backlink settings for user ${userId}: DA ${settings.min_domain_authority}-${settings.max_domain_authority}, Difficulty ${settings.min_difficulty}-${settings.max_difficulty}`);

    res.json({
      message: 'Backlink discovery settings updated successfully',
      settings: {
        minDomainAuthority: settings.min_domain_authority,
        maxDomainAuthority: settings.max_domain_authority,
        minDifficulty: settings.min_difficulty,
        maxDifficulty: settings.max_difficulty,
        minTraffic: settings.min_traffic,
        excludeEduGov: settings.exclude_edu_gov,
        excludeNewsSites: settings.exclude_news_sites,
      },
    });
  } catch (error) {
    console.error('Update backlink settings error:', error);
    res.status(500).json({ error: 'Failed to update backlink settings' });
  }
};

module.exports = {
  discoverOpportunities,
  getOpportunities,
  getOpportunity,
  updateOpportunity,
  getCampaignStats,
  getBacklinkSettings,
  updateBacklinkSettings,
};
