const axios = require('axios');

// Resend Email Sending Service - Handle actual email delivery

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';

/**
 * Send email using Resend API
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (HTML or plain text)
 * @param {string} fromEmail - Sender email (optional)
 * @returns {object} Result of email sending
 */
const sendEmailViaResend = async (to, subject, body, fromEmail = FROM_EMAIL) => {
  try {
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured, email will not be sent');
      return {
        success: false,
        error: 'Email service not configured',
        message: 'RESEND_API_KEY environment variable is not set',
        mock: true,
      };
    }

    console.log(`📧 Sending email via Resend to ${to}...`);

    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: fromEmail,
        to: to,
        subject: subject,
        html: body,
      },
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Email sent successfully (ID: ${response.data.id})`);

    return {
      success: true,
      messageId: response.data.id,
      to: to,
      subject: subject,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ Error sending email via Resend:`, error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      to: to,
      subject: subject,
    };
  }
};

/**
 * Extract email from domain (guess the email)
 * This is a heuristic approach - common patterns: contact@, info@, hello@, support@
 * @param {string} domain - Domain name
 * @returns {string} Guessed email address
 */
const guessEmailFromDomain = (domain) => {
  const commonPrefixes = ['contact', 'info', 'hello', 'support', 'business', 'sales'];

  // Try to extract clean domain
  let cleanDomain = domain;
  if (cleanDomain.includes('www.')) {
    cleanDomain = cleanDomain.replace('www.', '');
  }
  if (cleanDomain.includes('http://')) {
    cleanDomain = cleanDomain.replace('http://', '');
  }
  if (cleanDomain.includes('https://')) {
    cleanDomain = cleanDomain.replace('https://', '');
  }

  // Return most likely contact email
  return `${commonPrefixes[0]}@${cleanDomain}`;
};

/**
 * Send outreach email with fallback to mock if no API key
 * @param {object} emailData - Email data
 * @param {string} emailData.to - Recipient email or domain
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body
 * @returns {object} Sending result
 */
const sendOutreachEmail = async (emailData) => {
  const { to, subject, body, fromEmail } = emailData;

  // If 'to' looks like a domain, try to guess email
  let recipientEmail = to;
  if (!to.includes('@')) {
    recipientEmail = guessEmailFromDomain(to);
    console.log(`🔍 Domain detected, guessing email: ${recipientEmail}`);
  }

  return sendEmailViaResend(recipientEmail, subject, body, fromEmail);
};

module.exports = {
  sendEmailViaResend,
  sendOutreachEmail,
  guessEmailFromDomain,
};
