const { pool } = require('../config/database');
const {
  generateRedditMessage,
  validateMessage,
  getAvailableProviders,
} = require('../services/aiMessageService');
const { getPreferredAiProvider } = require('./settingsController');

/**
 * Generate AI message for a Reddit thread
 * POST /api/ai/reddit/generate-message
 */
const generateThreadMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      websiteId,
      threadId,
      threadTitle,
      subredditName,
      includeLink = false,
      customContext = null,
    } = req.body;

    // Validation
    if (!threadId || !threadTitle || !subredditName) {
      return res.status(400).json({
        error: 'threadId, threadTitle, and subredditName are required',
      });
    }

    console.log(`🤖 Generating message for thread: "${threadTitle}"`);

    // Get website info for context
    const websiteResult = await pool.query(
      'SELECT id, domain, target_keywords FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // Get user's preferred AI provider
    const settingsResult = await pool.query(
      'SELECT preferred_ai_provider FROM user_settings WHERE user_id = $1',
      [userId]
    );

    const provider = settingsResult.rows[0]?.preferred_ai_provider || 'openai';

    // Prepare context for message generation
    const generationContext = {
      threadTitle,
      subredditName,
      userKeywords: website.target_keywords
        ? website.target_keywords.split(',').map((k) => k.trim())
        : [],
      websiteUrl: website.domain,
      websiteDescription: customContext?.websiteDescription || '',
      includeLink,
      provider,
    };

    // Generate message using AI
    const aiResult = await generateRedditMessage(userId, generationContext);

    // Validate the generated message
    const validation = validateMessage(aiResult.message);

    console.log(`✅ Message generated and validated (score: ${validation.score})`);

    // Save generated message to database for tracking
    const engagementResult = await pool.query(
      `INSERT INTO reddit_thread_engagements (
        website_id, reddit_thread_id, engagement_type,
        ai_generated_message, status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at`,
      [websiteId, threadId, 'comment', aiResult.message, 'draft']
    );

    res.json({
      message: aiResult.message,
      provider: aiResult.provider,
      model: aiResult.model,
      tokensUsed: aiResult.tokens_used,
      engagementId: engagementResult.rows[0].id,
      validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        score: validation.score,
      },
      createdAt: engagementResult.rows[0].created_at,
    });
  } catch (error) {
    console.error('Generate message error:', error);
    res.status(500).json({
      error: 'Failed to generate message',
      details: error.message,
    });
  }
};

/**
 * Regenerate AI message with different settings
 * POST /api/ai/reddit/regenerate-message
 */
const regenerateThreadMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      engagementId,
      threadTitle,
      subredditName,
      includeLink = false,
      customContext = null,
    } = req.body;

    console.log(`🔄 Regenerating message for engagement: ${engagementId}`);

    // Verify engagement exists and user owns it
    const engagementResult = await pool.query(
      `SELECT website_id, reddit_thread_id FROM reddit_thread_engagements
       WHERE id = $1 AND website_id IN (SELECT id FROM websites WHERE user_id = $2)`,
      [engagementId, userId]
    );

    if (engagementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    const engagement = engagementResult.rows[0];

    // Get website info
    const websiteResult = await pool.query(
      'SELECT domain, target_keywords FROM websites WHERE id = $1',
      [engagement.website_id]
    );

    const website = websiteResult.rows[0];

    // Get user's preferred AI provider
    const settingsResult = await pool.query(
      'SELECT preferred_ai_provider FROM user_settings WHERE user_id = $1',
      [userId]
    );

    const provider = settingsResult.rows[0]?.preferred_ai_provider || 'openai';

    // Prepare context
    const generationContext = {
      threadTitle,
      subredditName,
      userKeywords: website.target_keywords
        ? website.target_keywords.split(',').map((k) => k.trim())
        : [],
      websiteUrl: website.domain,
      websiteDescription: customContext?.websiteDescription || '',
      includeLink,
      provider,
    };

    // Generate new message
    const aiResult = await generateRedditMessage(userId, generationContext);

    // Validate
    const validation = validateMessage(aiResult.message);

    // Update engagement with new message
    await pool.query(
      `UPDATE reddit_thread_engagements
       SET ai_generated_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [aiResult.message, engagementId]
    );

    res.json({
      message: aiResult.message,
      provider: aiResult.provider,
      model: aiResult.model,
      tokensUsed: aiResult.tokens_used,
      validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        score: validation.score,
      },
    });
  } catch (error) {
    console.error('Regenerate message error:', error);
    res.status(500).json({
      error: 'Failed to regenerate message',
      details: error.message,
    });
  }
};

/**
 * Update engagement message (user custom edits)
 * PUT /api/ai/reddit/engagement/:engagementId
 */
const updateEngagementMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { engagementId } = req.params;
    const { userCustomMessage, includeLink } = req.body;

    if (!userCustomMessage) {
      return res.status(400).json({ error: 'userCustomMessage is required' });
    }

    // Verify engagement exists and user owns it
    const engagementResult = await pool.query(
      `SELECT website_id FROM reddit_thread_engagements
       WHERE id = $1 AND website_id IN (SELECT id FROM websites WHERE user_id = $2)`,
      [engagementId, userId]
    );

    if (engagementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    // Validate custom message
    const validation = validateMessage(userCustomMessage);

    // Update engagement
    const result = await pool.query(
      `UPDATE reddit_thread_engagements
       SET user_custom_message = $1, status = 'reviewed', updated_at = NOW()
       WHERE id = $2
       RETURNING id, ai_generated_message, user_custom_message, status`,
      [userCustomMessage, engagementId]
    );

    res.json({
      message: result.rows[0].user_custom_message || result.rows[0].ai_generated_message,
      status: result.rows[0].status,
      validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        score: validation.score,
      },
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Update engagement error:', error);
    res.status(500).json({
      error: 'Failed to update engagement',
      details: error.message,
    });
  }
};

/**
 * Get engagement details with both AI and user messages
 * GET /api/ai/reddit/engagement/:engagementId
 */
const getEngagementDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { engagementId } = req.params;

    // Verify engagement exists and user owns it
    const result = await pool.query(
      `SELECT rte.id, rte.reddit_thread_id, rte.ai_generated_message,
              rte.user_custom_message, rte.status, rte.created_at,
              rte.updated_at, rt.thread_title, rt.thread_url
       FROM reddit_thread_engagements rte
       JOIN reddit_threads rt ON rte.reddit_thread_id = rt.id
       WHERE rte.id = $1 AND rte.website_id IN (SELECT id FROM websites WHERE user_id = $2)`,
      [engagementId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    const engagement = result.rows[0];

    // Determine which message to show (user custom or AI generated)
    const finalMessage = engagement.user_custom_message || engagement.ai_generated_message;
    const messageSource = engagement.user_custom_message ? 'user' : 'ai';

    res.json({
      id: engagement.id,
      threadId: engagement.reddit_thread_id,
      threadTitle: engagement.thread_title,
      threadUrl: engagement.thread_url,
      aiGeneratedMessage: engagement.ai_generated_message,
      userCustomMessage: engagement.user_custom_message,
      finalMessage,
      messageSource,
      status: engagement.status,
      createdAt: engagement.created_at,
      updatedAt: engagement.updated_at,
    });
  } catch (error) {
    console.error('Get engagement error:', error);
    res.status(500).json({
      error: 'Failed to fetch engagement details',
      details: error.message,
    });
  }
};

module.exports = {
  generateThreadMessage,
  regenerateThreadMessage,
  updateEngagementMessage,
  getEngagementDetails,
};
