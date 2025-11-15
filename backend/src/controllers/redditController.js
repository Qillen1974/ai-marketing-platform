const { pool } = require('../config/database');
const { discoverRedditCommunities, getSubredditInfo } = require('../services/redditService');

/**
 * Discover Reddit communities for a website
 * POST /api/reddit/:websiteId/discover
 */
const discoverCommunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id, target_keywords FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];
    console.log(`🔗 Starting Reddit community discovery for website: ${websiteId}`);

    // Parse target keywords
    const keywords = website.target_keywords
      ? website.target_keywords.split(',').map((k) => k.trim()).slice(0, 5)
      : ['digital marketing', 'seo', 'online marketing'];

    // Discover communities
    const communities = await discoverRedditCommunities(keywords);

    if (communities.length === 0) {
      return res.status(200).json({
        message: 'No Reddit communities found at this time',
        communities: [],
      });
    }

    // Save communities to database
    const savedCommunities = [];
    for (const community of communities) {
      try {
        const result = await pool.query(
          `INSERT INTO reddit_communities (
            website_id, subreddit_name, display_name, description, subscribers,
            active_users, relevance_score, posting_allowed, self_promotion_allowed,
            requires_karma, subreddit_age_days, avg_posts_per_day, reddit_url,
            reddit_icon_url, community_type, difficulty_to_post
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (website_id, subreddit_name)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            subscribers = EXCLUDED.subscribers,
            active_users = EXCLUDED.active_users,
            relevance_score = EXCLUDED.relevance_score,
            last_scanned = NOW()
          RETURNING id, subreddit_name, display_name, relevance_score, difficulty_to_post, subscribers`,
          [
            websiteId,
            community.subreddit_name,
            community.display_name,
            community.description,
            community.subscribers,
            community.active_users,
            community.relevance_score,
            community.posting_allowed,
            community.self_promotion_allowed,
            community.requires_karma,
            community.subreddit_age_days,
            community.avg_posts_per_day,
            community.reddit_url,
            community.reddit_icon_url,
            community.community_type,
            community.difficulty_to_post,
          ]
        );

        savedCommunities.push({
          id: result.rows[0].id,
          subredditName: result.rows[0].subreddit_name,
          displayName: result.rows[0].display_name,
          relevanceScore: result.rows[0].relevance_score,
          difficulty: result.rows[0].difficulty_to_post,
          subscribers: result.rows[0].subscribers,
        });
      } catch (insertError) {
        console.error(`Error saving community ${community.subreddit_name}:`, insertError.message);
      }
    }

    console.log(`✅ Saved ${savedCommunities.length} communities to database`);

    res.json({
      message: `Discovered ${savedCommunities.length} Reddit communities`,
      communities: savedCommunities,
    });
  } catch (error) {
    console.error('Discover communities error:', error);
    res.status(500).json({ error: 'Failed to discover Reddit communities' });
  }
};

/**
 * Get all Reddit communities for a website
 * GET /api/reddit/:websiteId/communities
 */
const getCommunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId } = req.params;
    const { tracked = false, difficulty, limit = 50, offset = 0 } = req.query;

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
      SELECT id, subreddit_name, display_name, description, subscribers, active_users,
             relevance_score, posting_allowed, self_promotion_allowed, difficulty_to_post,
             subreddit_age_days, avg_posts_per_day, reddit_url, reddit_icon_url,
             community_type, tracked, notes, last_scanned, created_at
      FROM reddit_communities
      WHERE website_id = $1
    `;
    const params = [websiteId];
    let paramIndex = 2;

    // Filter by tracked status
    if (tracked === 'true') {
      query += ` AND tracked = true`;
    } else if (tracked === 'false') {
      query += ` AND tracked = false`;
    }

    // Filter by difficulty
    if (difficulty) {
      query += ` AND difficulty_to_post = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    // Order by relevance and subscribers
    query += ` ORDER BY relevance_score DESC, subscribers DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const communities = result.rows.map((c) => ({
      id: c.id,
      subredditName: c.subreddit_name,
      displayName: c.display_name,
      description: c.description,
      subscribers: c.subscribers,
      activeUsers: c.active_users,
      relevanceScore: c.relevance_score,
      postingAllowed: c.posting_allowed,
      selfPromotionAllowed: c.self_promotion_allowed,
      difficulty: c.difficulty_to_post,
      subredditAge: c.subreddit_age_days,
      avgPostsPerDay: parseFloat(c.avg_posts_per_day) || 0,
      redditUrl: c.reddit_url,
      redditIconUrl: c.reddit_icon_url,
      communityType: c.community_type,
      tracked: c.tracked,
      notes: c.notes,
      lastScanned: c.last_scanned,
      createdAt: c.created_at,
    }));

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM reddit_communities WHERE website_id = $1`;
    const countResult = await pool.query(countQuery, [websiteId]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      communities,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get communities error:', error);
    res.status(500).json({ error: 'Failed to fetch Reddit communities' });
  }
};

/**
 * Track/untrack a Reddit community
 * PUT /api/reddit/:websiteId/communities/:communityId/track
 */
const trackCommunity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, communityId } = req.params;
    const { tracked, notes } = req.body;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Update community tracking
    const result = await pool.query(
      `UPDATE reddit_communities
       SET tracked = $1, notes = $2, updated_at = NOW()
       WHERE id = $3 AND website_id = $4
       RETURNING *`,
      [tracked, notes || null, communityId, websiteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const community = result.rows[0];
    console.log(`✅ Community ${community.subreddit_name} tracking updated: ${tracked}`);

    res.json({
      message: 'Community tracking updated',
      community: {
        id: community.id,
        subredditName: community.subreddit_name,
        tracked: community.tracked,
        notes: community.notes,
      },
    });
  } catch (error) {
    console.error('Track community error:', error);
    res.status(500).json({ error: 'Failed to update community tracking' });
  }
};

/**
 * Log a participation/post in a community
 * POST /api/reddit/:websiteId/communities/:communityId/log-participation
 */
const logParticipation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, communityId } = req.params;
    const { participationType, postTitle, postUrl, postContent, redditPostId, status } = req.body;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Verify community exists
    const communityResult = await pool.query(
      'SELECT id FROM reddit_communities WHERE id = $1 AND website_id = $2',
      [communityId, websiteId]
    );

    if (communityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Log participation
    const result = await pool.query(
      `INSERT INTO reddit_participations (
        website_id, reddit_community_id, participation_type, post_title,
        post_url, post_content, reddit_post_id, status, posted_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id, participation_type, posted_date`,
      [
        websiteId,
        communityId,
        participationType,
        postTitle || null,
        postUrl || null,
        postContent || null,
        redditPostId || null,
        status || 'posted',
      ]
    );

    const participation = result.rows[0];
    console.log(`✅ Logged participation in community ${communityId}`);

    res.status(201).json({
      message: 'Participation logged successfully',
      participation: {
        id: participation.id,
        type: participation.participation_type,
        postedAt: participation.posted_date,
      },
    });
  } catch (error) {
    console.error('Log participation error:', error);
    res.status(500).json({ error: 'Failed to log participation' });
  }
};

/**
 * Get participation history for a community
 * GET /api/reddit/:websiteId/communities/:communityId/participations
 */
const getParticipations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, communityId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get participations
    const result = await pool.query(
      `SELECT id, participation_type, post_title, post_url, upvotes, comments_count,
              posted_date, traffic_from_reddit, status
       FROM reddit_participations
       WHERE website_id = $1 AND reddit_community_id = $2
       ORDER BY posted_date DESC
       LIMIT $3 OFFSET $4`,
      [websiteId, communityId, limit, offset]
    );

    const participations = result.rows.map((p) => ({
      id: p.id,
      type: p.participation_type,
      title: p.post_title,
      url: p.post_url,
      upvotes: p.upvotes,
      comments: p.comments_count,
      postedAt: p.posted_date,
      traffic: p.traffic_from_reddit,
      status: p.status,
    }));

    res.json({
      participations,
      count: participations.length,
    });
  } catch (error) {
    console.error('Get participations error:', error);
    res.status(500).json({ error: 'Failed to fetch participations' });
  }
};

module.exports = {
  discoverCommunities,
  getCommunities,
  trackCommunity,
  logParticipation,
  getParticipations,
};
