const axios = require('axios');

// Email Service - Generate personalized outreach emails using Claude API

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Email templates for different opportunity types
 */
const emailTemplates = {
  guest_post: {
    subject: 'Guest Post Opportunity: {site_name}',
    prompt: `Generate a professional guest post pitch email.
Details:
- Target Site: {site_name}
- Your Domain: {your_domain}
- Target Keywords: {keywords}
- Pitch: Write about {topic}

Create a compelling subject line and email body that:
1. Starts with a personalized greeting
2. Explains why you want to write for them
3. Proposes 2-3 article topics related to their niche
4. Highlights your expertise
5. Includes a brief bio and link to your site
6. Ends with a call to action

Format as:
SUBJECT: [subject line]
BODY: [email body]`,
  },

  resource_page: {
    subject: 'Resource for {site_name}: {topic}',
    prompt: `Generate a professional email requesting to be added to a resource page.
Details:
- Target Site: {site_name}
- Your Domain: {your_domain}
- Target Keywords: {keywords}
- Resource Description: {description}

Create a compelling email that:
1. Compliments their resource page
2. Explains why your content would be valuable
3. Describes the specific resource/article
4. Highlights relevant stats/metrics
5. Includes link and anchor text suggestion
6. Is concise and professional

Format as:
SUBJECT: [subject line]
BODY: [email body]`,
  },

  broken_link: {
    subject: 'Broken Link Replacement for {site_name}',
    prompt: `Generate an email offering to fix a broken link on their page.
Details:
- Target Site: {site_name}
- Your Domain: {your_domain}
- Broken Link Topic: {topic}
- Your Alternative: {alternative}

Create an email that:
1. Politely informs them of a broken link
2. Provides context about the topic
3. Offers your content as a high-quality replacement
4. Shows understanding of their niche
5. Includes specific link details
6. Includes a call to action

Format as:
SUBJECT: [subject line]
BODY: [email body]`,
  },

  directory: {
    subject: '{site_name} - Directory Submission',
    prompt: `Generate a professional directory submission email.
Details:
- Directory Name: {site_name}
- Your Domain: {your_domain}
- Your Description: {description}
- Category: {category}

Create an email that:
1. Expresses interest in being listed
2. Briefly describes your site/service
3. Highlights relevant credentials
4. Shows you understand their directory
5. Is professional and concise
6. Includes necessary contact details

Format as:
SUBJECT: [subject line]
BODY: [email body]`,
  },
};

/**
 * Generate personalized email using Claude API
 * @param {object} opportunity - Backlink opportunity details
 * @param {string} opportunityType - Type of opportunity (guest_post, resource_page, etc.)
 * @param {string} yourDomain - Your website domain
 * @param {array} keywords - Target keywords
 * @returns {object} Generated email with subject and body
 */
const generateEmail = async (opportunity, opportunityType, yourDomain, keywords) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  Anthropic API key not configured, using template email');
      return generateTemplateEmail(opportunity, opportunityType, yourDomain, keywords);
    }

    const template = emailTemplates[opportunityType] || emailTemplates.resource_page;

    // Build prompt with opportunity details
    const prompt = template.prompt
      .replace(/{site_name}/g, opportunity.sourceDomain)
      .replace(/{your_domain}/g, yourDomain)
      .replace(/{keywords}/g, keywords.slice(0, 3).join(', '))
      .replace(/{topic}/g, keywords[0] || 'your industry')
      .replace(/{description}/g, opportunity.description || 'high-quality content')
      .replace(/{category}/g, opportunityType)
      .replace(/{alternative}/g, 'our comprehensive guide');

    console.log(`🤖 Generating email for ${opportunity.sourceDomain} (${opportunityType})...`);

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const generatedText = response.data.content[0].text;

    // Parse subject and body from response
    const subjectMatch = generatedText.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = generatedText.match(/BODY:\s*([\s\S]+)$/i);

    const subject = subjectMatch ? subjectMatch[1].trim() : `Collaboration with ${opportunity.sourceDomain}`;
    const body = bodyMatch ? bodyMatch[1].trim() : generatedText;

    console.log(`✅ Email generated successfully`);

    return {
      subject,
      body,
      isGenerated: true,
      model: 'claude-3-5-sonnet-20241022',
    };
  } catch (error) {
    console.error('❌ Error generating email with Claude:', error.message);
    // Fall back to template email
    return generateTemplateEmail(opportunity, opportunityType, yourDomain, keywords);
  }
};

/**
 * Generate template email (fallback when API is unavailable)
 * @param {object} opportunity - Backlink opportunity details
 * @param {string} opportunityType - Type of opportunity
 * @param {string} yourDomain - Your website domain
 * @param {array} keywords - Target keywords
 * @returns {object} Template email
 */
const generateTemplateEmail = (opportunity, opportunityType, yourDomain, keywords) => {
  const templates = {
    guest_post: {
      subject: `Guest Post Opportunity for ${opportunity.sourceDomain}`,
      body: `Hi Team at ${opportunity.sourceDomain},

I'm reaching out because I'm impressed with the quality content you publish about ${keywords[0] || 'your industry'}.

I'm the founder of ${yourDomain}, and I specialize in ${keywords.slice(0, 2).join(' and ')}. I believe your audience would benefit from my unique perspective on these topics.

I'd love to contribute a guest post. Here are a few topic ideas:
1. "${keywords[0]}: Best Practices and Strategies"
2. "Advanced Tips for ${keywords[1] || 'Success'}"
3. "The Future of ${keywords[0]}: Trends to Watch"

I have extensive experience in this space and can provide well-researched, actionable content that adds value to your readers.

Would you be open to a discussion about this opportunity?

Best regards,
${yourDomain} Team`,
    },

    resource_page: {
      subject: `Resource Addition for ${opportunity.sourceDomain}`,
      body: `Hi ${opportunity.sourceDomain} Team,

I've been following your excellent resource page on ${keywords[0]}, and I think it would be even more valuable with our contribution.

We've created a comprehensive guide on "${keywords[0]}" that your audience would find extremely useful. Here are the key highlights:
- In-depth analysis and strategies
- Actionable tips and best practices
- Data-driven insights
- Free, high-quality resource

I'd love for our resource to be featured on your page. Here's the information:

Title: [Resource Title]
URL: https://${yourDomain}/[resource-path]
Description: Comprehensive guide to ${keywords[0]}

Would this be a good fit for your resource page? I'm confident your readers will find it valuable.

Best regards,
${yourDomain} Team`,
    },

    broken_link: {
      subject: `Broken Link Fix for ${opportunity.sourceDomain}`,
      body: `Hi ${opportunity.sourceDomain} Team,

While reviewing your content on "${keywords[0]}", I noticed you have a broken link in one of your articles. I wanted to let you know and offer an alternative.

The broken link seems to reference content about ${keywords[0]}. We have a comprehensive guide on this topic that would be a perfect replacement:

URL: https://${yourDomain}/[resource-path]
Relevance: Highly relevant to your article
Quality: Comprehensive, well-researched content

I think this resource would provide great value to your readers and improve your page's user experience.

Would you be interested in using this as a replacement? I'm happy to provide more details.

Best regards,
${yourDomain} Team`,
    },

    directory: {
      subject: `${yourDomain} - Directory Submission`,
      body: `Hello,

I'd like to submit ${yourDomain} for inclusion in your directory.

About Us:
${yourDomain} specializes in ${keywords.slice(0, 2).join(' and ')}. We help businesses and professionals succeed in these areas through expert content and resources.

Why we're a good fit:
- High-quality, authoritative content
- Active in the ${keywords[0]} space
- Engaged community and audience
- Professional and trustworthy brand

Website: https://${yourDomain}
Category: ${keywords[0]}
Description: Leading resource for ${keywords.join(', ')}

We believe our site would add value to your directory and serve your users well.

Thank you for considering our submission!

Best regards,
${yourDomain} Team`,
    },
  };

  const template = templates[opportunityType] || templates.resource_page;

  return {
    subject: template.subject,
    body: template.body,
    isGenerated: false,
    model: 'template',
  };
};

/**
 * Get email templates available
 * @returns {object} Available templates with descriptions
 */
const getEmailTemplates = () => {
  return {
    guest_post: 'Pitch guest post article',
    resource_page: 'Request to be listed on resource page',
    broken_link: 'Offer to fix broken link',
    directory: 'Submit to directory listing',
  };
};

module.exports = {
  generateEmail,
  getEmailTemplates,
};
