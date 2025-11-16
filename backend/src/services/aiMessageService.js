const axios = require('axios');
const { getDecryptedApiKey } = require('../controllers/settingsController');

// AI Message Generation Service
// Generates contextual Reddit messages using user's configured AI providers

/**
 * Generate AI message for a Reddit thread
 * Uses user's preferred AI provider (OpenAI, Claude, or Gemini)
 * @param {number} userId - User ID
 * @param {object} context - Context for message generation
 *   - threadTitle: The Reddit thread title
 *   - subredditName: Name of the subreddit
 *   - userKeywords: Array of keywords user is targeting
 *   - websiteUrl: User's website URL
 *   - websiteDescription: Brief description of website
 *   - includeLink: Whether to include product/website link
 * @returns {object} { message: string, provider: string, tokens_used: number }
 */
const generateRedditMessage = async (userId, context) => {
  try {
    console.log(`🤖 Generating AI message for Reddit thread`);

    // Get user's preferred AI provider
    const preferredProvider = context.provider || 'openai';

    // Validate context
    if (!context.threadTitle || !context.subredditName) {
      throw new Error('Thread title and subreddit name are required');
    }

    // Build the prompt based on context
    const prompt = buildRedditMessagePrompt(context);

    console.log(`📨 Using provider: ${preferredProvider}`);

    let result;
    if (preferredProvider === 'openai') {
      result = await generateWithOpenAI(userId, prompt, context);
    } else if (preferredProvider === 'claude') {
      result = await generateWithClaude(userId, prompt, context);
    } else if (preferredProvider === 'gemini') {
      result = await generateWithGemini(userId, prompt, context);
    } else {
      throw new Error(`Unsupported AI provider: ${preferredProvider}`);
    }

    console.log(`✅ Message generated (${result.tokens_used} tokens)`);
    return result;
  } catch (error) {
    console.error('❌ Error generating AI message:', error.message);
    throw error;
  }
};

/**
 * Build a detailed prompt for Reddit message generation
 * @param {object} context - Generation context
 * @returns {string} Detailed prompt
 */
const buildRedditMessagePrompt = (context) => {
  const {
    threadTitle,
    subredditName,
    userKeywords = [],
    websiteUrl,
    websiteDescription,
    includeLink = false,
  } = context;

  let prompt = `You are a helpful Reddit community member writing a response to a thread in r/${subredditName}.

Thread Title: "${threadTitle}"

Your task is to write a natural, helpful comment that:
1. Directly addresses the thread topic
2. Provides genuine value to the discussion
3. Is written in a casual, friendly Reddit tone
4. Does NOT sound like spam or marketing
5. Is concise (2-4 sentences maximum)`;

  if (userKeywords && userKeywords.length > 0) {
    prompt += `\n\nKey topics you can reference naturally: ${userKeywords.join(', ')}`;
  }

  if (websiteDescription && includeLink) {
    prompt += `\n\nIf relevant, you may mention: "${websiteDescription}"`;
    prompt += `\nWebsite: ${websiteUrl}`;
    prompt += `\nBUT only include the link if it genuinely helps answer the question. Do NOT force it.`;
  } else if (!includeLink) {
    prompt += `\n\nDo NOT include any links or mention your website in this message.`;
  }

  prompt += `\n\nWrite only the comment text, nothing else. No quotes, no meta-discussion.`;

  return prompt;
};

/**
 * Generate message using OpenAI API
 * @private
 */
const generateWithOpenAI = async (userId, prompt, context) => {
  try {
    const apiKey = await getDecryptedApiKey(userId, 'openai');

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful Reddit community member. Write natural, genuine responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const message = response.data.choices[0].message.content.trim();

    return {
      message,
      provider: 'openai',
      tokens_used: response.data.usage?.total_tokens || 0,
      model: 'gpt-3.5-turbo',
    };
  } catch (error) {
    console.error('OpenAI error:', error.message);
    throw error;
  }
};

/**
 * Generate message using Anthropic Claude API
 * @private
 */
const generateWithClaude = async (userId, prompt, context) => {
  try {
    const apiKey = await getDecryptedApiKey(userId, 'claude');

    if (!apiKey) {
      throw new Error('Claude API key not configured');
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        system:
          'You are a helpful Reddit community member. Write natural, genuine responses that provide value.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (!response.data.content || response.data.content.length === 0) {
      throw new Error('No response from Claude');
    }

    const message = response.data.content[0].text.trim();

    return {
      message,
      provider: 'claude',
      tokens_used: response.data.usage?.input_tokens + response.data.usage?.output_tokens || 0,
      model: 'claude-3-haiku-20240307',
    };
  } catch (error) {
    console.error('Claude error:', error.message);
    throw error;
  }
};

/**
 * Generate message using Google Gemini API
 * @private
 */
const generateWithGemini = async (userId, prompt, context) => {
  try {
    const apiKey = await getDecryptedApiKey(userId, 'gemini');

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      },
      {
        timeout: 30000,
      }
    );

    if (
      !response.data.candidates ||
      response.data.candidates.length === 0 ||
      !response.data.candidates[0].content?.parts?.[0]?.text
    ) {
      throw new Error('No response from Gemini');
    }

    const message = response.data.candidates[0].content.parts[0].text.trim();

    return {
      message,
      provider: 'gemini',
      tokens_used: response.data.usageMetadata?.totalTokenCount || 0,
      model: 'gemini-pro',
    };
  } catch (error) {
    console.error('Gemini error:', error.message);
    throw error;
  }
};

/**
 * Validate AI-generated message (check for spam patterns)
 * @param {string} message - The generated message
 * @returns {object} { isValid: boolean, warnings: array, score: number }
 */
const validateMessage = (message) => {
  const warnings = [];
  let score = 100; // Start with perfect score

  // Check length
  if (message.length > 500) {
    warnings.push('Message is quite long (500+ chars). Reddit often prefers concise replies.');
    score -= 15;
  }

  if (message.length < 20) {
    warnings.push('Message is very short. Consider expanding for more value.');
    score -= 10;
  }

  // Check for spam patterns
  const spamPatterns = [
    /check out|visit|click here|link below/i,
    /buy now|limited offer|special deal/i,
    /make \$|earn \$|work from home/i,
    /guarantee|100% free|no hidden/i,
    /https?:\/\/[^\s]+/i, // URLs
  ];

  spamPatterns.forEach((pattern) => {
    if (pattern.test(message)) {
      warnings.push(`Message contains potential spam pattern: "${pattern.source}"`);
      score -= 20;
    }
  });

  // Check for multiple exclamation marks
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    warnings.push('Too many exclamation marks. Tone down enthusiasm.');
    score -= 10;
  }

  // Check for all caps words (except 1-2 letter words)
  const capsWords = message.match(/\b[A-Z]{2,}\b/g) || [];
  if (capsWords.length > 2) {
    warnings.push('Multiple capitalized words detected. Avoid SHOUTING.');
    score -= 10;
  }

  return {
    isValid: score >= 50,
    warnings,
    score: Math.max(score, 0),
  };
};

/**
 * Get available AI providers for a user
 * @param {number} userId - User ID
 * @returns {array} Array of configured providers
 */
const getAvailableProviders = async (userId) => {
  try {
    // This would need to be implemented in settings controller
    // For now, returning a placeholder
    return ['openai', 'claude', 'gemini'];
  } catch (error) {
    console.error('Error getting available providers:', error);
    return [];
  }
};

module.exports = {
  generateRedditMessage,
  buildRedditMessagePrompt,
  validateMessage,
  getAvailableProviders,
};
