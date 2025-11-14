const { pool } = require('../config/database');
const { generateEmail } = require('../services/emailService');
const { sendOutreachEmail: sendEmailViaService } = require('../services/emailSendingService');
const { checkLimit, trackUsage } = require('../services/usageService');

/**
 * Generate outreach email for an opportunity
 */
const generateOutreachEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, opportunityId } = req.params;
    const { messageType = 'initial' } = req.body;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT domain, target_keywords FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // Get opportunity details
    const opportunityResult = await pool.query(
      `SELECT id, source_domain, source_url, opportunity_type, relevance_score
       FROM backlink_opportunities
       WHERE id = $1 AND website_id = $2`,
      [opportunityId, websiteId]
    );

    if (opportunityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const opportunity = opportunityResult.rows[0];

    // Parse keywords
    const keywords = website.target_keywords
      ? website.target_keywords.split(',').map((k) => k.trim())
      : ['marketing', 'seo'];

    console.log(
      `📧 Generating ${messageType} email for ${opportunity.source_domain}...`
    );

    // Generate email using Claude API or template
    const emailContent = await generateEmail(
      opportunity,
      opportunity.opportunity_type,
      website.domain,
      keywords
    );

    res.json({
      message: 'Email generated successfully',
      email: {
        subject: emailContent.subject,
        body: emailContent.body,
        model: emailContent.model,
        isGenerated: emailContent.isGenerated,
      },
    });
  } catch (error) {
    console.error('Generate email error:', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
};

/**
 * Send outreach email and save to database
 */
const sendOutreachEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, opportunityId } = req.params;
    const { subject, body, messageType = 'initial' } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Verify opportunity ownership
    const opportunityResult = await pool.query(
      'SELECT id FROM backlink_opportunities WHERE id = $1 AND website_id = $2',
      [opportunityId, websiteId]
    );

    if (opportunityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Get user plan and check quota
    const userResult = await pool.query(
      'SELECT plan FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    // Check if user has email sending quota remaining
    const emailQuota = await checkLimit(userId, 'email_sent', user.plan);
    if (emailQuota.hasExceeded && !emailQuota.isUnlimited) {
      return res.status(429).json({
        error: 'Monthly email sending quota exceeded',
        quotaUsed: emailQuota.currentUsage,
        quotaLimit: emailQuota.limit,
        remaining: emailQuota.remaining,
        message: 'You have exceeded your monthly email sending limit. Upgrade your plan or provide your own Resend API key.',
      });
    }

    console.log(`📬 Sending outreach email for opportunity ${opportunityId}...`);

    // Get opportunity details to find contact info
    const oppDetailsResult = await pool.query(
      'SELECT contact_email, source_domain FROM backlink_opportunities WHERE id = $1',
      [opportunityId]
    );

    const opportunity = oppDetailsResult.rows[0];
    const recipientEmail = opportunity.contact_email || opportunity.source_domain;

    // Send email via Resend
    const emailResult = await sendEmailViaService({
      to: recipientEmail,
      subject: subject,
      body: body,
    });

    // Save outreach message
    const result = await pool.query(
      `INSERT INTO outreach_messages (website_id, opportunity_id, message_type, subject, body, status, sent_date, external_message_id)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       RETURNING id, status, sent_date`,
      [
        websiteId,
        opportunityId,
        messageType,
        subject,
        body,
        emailResult.success ? 'sent' : 'failed',
        emailResult.messageId || null,
      ]
    );

    const message = result.rows[0];

    // Update opportunity status to 'contacted' only if email was sent successfully
    if (emailResult.success) {
      await pool.query(
        'UPDATE backlink_opportunities SET status = $1, updated_at = NOW() WHERE id = $2',
        ['contacted', opportunityId]
      );
      console.log(`✅ Email sent successfully (Resend ID: ${emailResult.messageId})`);

      // Track usage only if email was actually sent
      await trackUsage(userId, 'email_sent', 1);
    } else {
      console.warn(`⚠️ Email sending failed: ${emailResult.error}`);
    }

    // Get updated quota for response
    const updatedQuota = await checkLimit(userId, 'email_sent', user.plan);

    res.json({
      message: emailResult.success ? 'Email sent successfully' : 'Failed to send email',
      outreach: {
        id: message.id,
        status: message.status,
        sentDate: message.sent_date,
        emailSuccess: emailResult.success,
        error: emailResult.error,
      },
      quotaRemaining: updatedQuota.remaining,
      quotaUsed: updatedQuota.currentUsage,
      quotaLimit: updatedQuota.limit,
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
};

/**
 * Get outreach history for a website
 */
const getOutreachHistory = async (req, res) => {
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

    // Get outreach history
    const result = await pool.query(
      `SELECT om.id, om.opportunity_id, om.message_type, om.subject, om.body,
              om.status, om.sent_date, om.response_received, om.response_date,
              bo.source_domain, bo.opportunity_type
       FROM outreach_messages om
       JOIN backlink_opportunities bo ON om.opportunity_id = bo.id
       WHERE om.website_id = $1
       ORDER BY om.sent_date DESC
       LIMIT $2 OFFSET $3`,
      [websiteId, limit, offset]
    );

    const messages = result.rows.map((msg) => ({
      id: msg.id,
      opportunityId: msg.opportunity_id,
      sourceDomain: msg.source_domain,
      opportunityType: msg.opportunity_type,
      messageType: msg.message_type,
      subject: msg.subject,
      body: msg.body,
      status: msg.status,
      sentDate: msg.sent_date,
      responseReceived: msg.response_received,
      responseDate: msg.response_date,
    }));

    res.json({ messages });
  } catch (error) {
    console.error('Get outreach history error:', error);
    res.status(500).json({ error: 'Failed to fetch outreach history' });
  }
};

/**
 * Update outreach message (mark as replied, update response, etc.)
 */
const updateOutreachMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { websiteId, messageId } = req.params;
    const { status, responseText, responseReceived } = req.body;

    // Verify website ownership
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE id = $1 AND user_id = $2',
      [websiteId, userId]
    );

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Update outreach message
    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (responseReceived !== undefined) {
      updateFields.push(`response_received = $${paramIndex}`);
      params.push(responseReceived);
      paramIndex++;
    }

    if (responseText) {
      updateFields.push(`response_text = $${paramIndex}`);
      params.push(responseText);
      paramIndex++;
      if (responseReceived !== false) {
        updateFields.push(`response_date = NOW()`);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(messageId);
    params.push(websiteId);

    const result = await pool.query(
      `UPDATE outreach_messages
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND website_id = $${paramIndex + 1}
       RETURNING id, status, response_received, response_date`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = result.rows[0];

    res.json({
      message: 'Outreach message updated successfully',
      outreach: {
        id: message.id,
        status: message.status,
        responseReceived: message.response_received,
        responseDate: message.response_date,
      },
    });
  } catch (error) {
    console.error('Update outreach error:', error);
    res.status(500).json({ error: 'Failed to update outreach message' });
  }
};

/**
 * Get outreach statistics
 */
const getOutreachStats = async (req, res) => {
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
        COUNT(*) as total_emails,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as emails_sent,
        SUM(CASE WHEN response_received = true THEN 1 ELSE 0 END) as responses_received,
        SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replies,
        ROUND(100.0 * SUM(CASE WHEN response_received = true THEN 1 ELSE 0 END) /
              NULLIF(COUNT(*), 0), 2) as response_rate
       FROM outreach_messages
       WHERE website_id = $1`,
      [websiteId]
    );

    const stats = statsResult.rows[0];

    res.json({
      stats: {
        totalEmails: parseInt(stats.total_emails) || 0,
        emailsSent: parseInt(stats.emails_sent) || 0,
        responsesReceived: parseInt(stats.responses_received) || 0,
        replies: parseInt(stats.replies) || 0,
        responseRate: parseFloat(stats.response_rate) || 0,
      },
    });
  } catch (error) {
    console.error('Get outreach stats error:', error);
    res.status(500).json({ error: 'Failed to fetch outreach statistics' });
  }
};

module.exports = {
  generateOutreachEmail,
  sendOutreachEmail,
  getOutreachHistory,
  updateOutreachMessage,
  getOutreachStats,
};
