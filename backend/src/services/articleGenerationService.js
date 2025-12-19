/**
 * Article Generation Service
 * Generates SEO-optimized articles using AI (OpenAI, Claude, Gemini)
 * Includes URL analysis, keyword extraction, article generation, and image creation
 */

const axios = require('axios');
const { parse } = require('node-html-parser');
const { pool } = require('../config/database');
const { getDecryptedApiKey } = require('../controllers/settingsController');
const { generateArticleHtml, calculateWordCount, generateSlug } = require('../templates/articleTemplate');

// ============================================
// URL Analysis & Keyword Extraction
// ============================================

/**
 * Analyze a website URL and extract keywords using AI
 * @param {number} userId - User ID for API key retrieval
 * @param {string} url - Website URL to analyze
 * @returns {object} { keywords, websiteDescription, targetAudience, websiteName }
 */
const analyzeWebsiteForKeywords = async (userId, url) => {
  try {
    console.log(`🔍 Analyzing URL for keywords: ${url}`);

    // Fetch webpage content
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
      },
    });
    const html = response.data;

    // Parse HTML and extract content
    const root = parse(html);
    const title = root.querySelector('title')?.text || '';
    const metaDesc =
      root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const h1s = root
      .querySelectorAll('h1')
      .map((h) => h.text)
      .join(' ');
    const h2s = root
      .querySelectorAll('h2')
      .map((h) => h.text)
      .join(' ');

    // Get main content text (try common content selectors)
    let mainContent = '';
    const contentSelectors = ['main', 'article', '.content', '#content', '.main-content', 'body'];
    for (const selector of contentSelectors) {
      const element = root.querySelector(selector);
      if (element) {
        mainContent = element.text.replace(/\s+/g, ' ').trim();
        if (mainContent.length > 200) break;
      }
    }

    // Extract domain name for website name
    const urlObj = new URL(url);
    const domainParts = urlObj.hostname.replace('www.', '').split('.');
    const websiteName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);

    // Use AI to generate keywords
    const prompt = `Analyze this website content and generate SEO keywords for article writing.

Website URL: ${url}
Title: ${title}
Meta Description: ${metaDesc}
Main Headings: ${h1s} ${h2s}
Content Summary: ${mainContent.substring(0, 2500)}

Based on this content, provide a JSON response with:
1. "keywords": Array of 10-15 highly relevant SEO keywords/phrases for writing blog articles (focus on long-tail keywords that would drive traffic)
2. "websiteDescription": A brief 2-3 sentence description of what this website does/offers
3. "targetAudience": Who this website serves (professionals, students, businesses, etc.)
4. "suggestedTopics": Array of 5 article topic ideas that would be relevant for this website's audience

Return ONLY valid JSON, no markdown or explanations.`;

    const aiResponse = await generateWithOpenAI(userId, prompt, 'gpt-4o');

    // Parse AI response
    let analysisResult;
    try {
      // Clean the response in case it has markdown code blocks
      let cleanResponse = aiResponse.message;
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }
      analysisResult = JSON.parse(cleanResponse.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse.message);
      throw new Error('Failed to parse keyword analysis response');
    }

    console.log(`✅ Extracted ${analysisResult.keywords?.length || 0} keywords`);

    return {
      keywords: analysisResult.keywords || [],
      websiteDescription: analysisResult.websiteDescription || '',
      targetAudience: analysisResult.targetAudience || '',
      websiteName: websiteName,
      suggestedTopics: analysisResult.suggestedTopics || [],
      tokensUsed: aiResponse.tokens_used,
    };
  } catch (error) {
    console.error('❌ Error analyzing website:', error.message);
    throw error;
  }
};

// ============================================
// Article Generation
// ============================================

/**
 * Generate a topic for the next article
 * @param {array} keywords - Available keywords
 * @param {array} previousTopics - Topics already used
 * @param {object} websiteInfo - Website information
 * @returns {object} { topic, targetKeyword, secondaryKeywords }
 */
const generateArticleTopic = async (userId, keywords, previousTopics, websiteInfo) => {
  const unusedKeywords = keywords.filter(
    (kw) => !previousTopics.some((topic) => topic.toLowerCase().includes(kw.toLowerCase()))
  );

  if (unusedKeywords.length === 0) {
    // All keywords used, start rotating
    console.log('♻️ All keywords used, rotating topics');
  }

  const keywordsToUse = unusedKeywords.length > 0 ? unusedKeywords : keywords;
  const primaryKeyword = keywordsToUse[Math.floor(Math.random() * keywordsToUse.length)];
  const secondaryKeywords = keywordsToUse
    .filter((kw) => kw !== primaryKeyword)
    .slice(0, 3);

  // Generate a specific topic using AI
  const prompt = `Generate a compelling blog article topic for an SEO article.

Website: ${websiteInfo.websiteName}
Description: ${websiteInfo.websiteDescription}
Target Audience: ${websiteInfo.targetAudience}

Primary Keyword to target: ${primaryKeyword}
Secondary Keywords: ${secondaryKeywords.join(', ')}

Previous article topics (avoid similar topics):
${previousTopics.slice(-10).join('\n')}

Generate a specific, engaging article title that:
1. Includes the primary keyword naturally
2. Appeals to US professionals
3. Promises value (how-to, benefits, guide, etc.)
4. Is 50-65 characters long

Return ONLY the article title, nothing else.`;

  const response = await generateWithOpenAI(userId, prompt, 'gpt-4o');

  return {
    topic: response.message.replace(/^["']|["']$/g, '').trim(),
    targetKeyword: primaryKeyword,
    secondaryKeywords: secondaryKeywords,
  };
};

/**
 * Generate full article content using AI
 * @param {number} userId - User ID
 * @param {string} topic - Article topic/title
 * @param {string} targetKeyword - Primary SEO keyword
 * @param {array} secondaryKeywords - Secondary keywords
 * @param {object} websiteInfo - Website information
 * @param {string} provider - AI provider (openai, claude, gemini)
 * @returns {object} Article content object
 */
const generateArticleContent = async (
  userId,
  topic,
  targetKeyword,
  secondaryKeywords,
  websiteInfo,
  provider = 'openai'
) => {
  console.log(`📝 Generating article: "${topic}"`);
  const startTime = Date.now();

  const prompt = buildArticlePrompt(topic, targetKeyword, secondaryKeywords, websiteInfo);

  let aiResponse;
  if (provider === 'openai') {
    aiResponse = await generateWithOpenAI(userId, prompt, 'gpt-4o');
  } else if (provider === 'claude') {
    aiResponse = await generateWithClaude(userId, prompt);
  } else if (provider === 'gemini') {
    aiResponse = await generateWithGemini(userId, prompt);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Parse the AI response
  let articleContent;
  try {
    let cleanResponse = aiResponse.message;
    if (cleanResponse.includes('```json')) {
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (cleanResponse.includes('```')) {
      cleanResponse = cleanResponse.replace(/```\n?/g, '');
    }
    articleContent = JSON.parse(cleanResponse.trim());
  } catch (parseError) {
    console.error('Failed to parse article response');
    throw new Error('Failed to parse article content from AI');
  }

  const generationTime = Date.now() - startTime;
  console.log(`✅ Article generated in ${generationTime}ms`);

  return {
    ...articleContent,
    tokensUsed: aiResponse.tokens_used,
    generationTimeMs: generationTime,
    provider: provider,
  };
};

/**
 * Build the detailed prompt for article generation
 */
const buildArticlePrompt = (topic, targetKeyword, secondaryKeywords, websiteInfo) => {
  return `Generate a comprehensive SEO-optimized blog article in JSON format.

ARTICLE REQUIREMENTS:
- Title: "${topic}"
- Primary Keyword: ${targetKeyword}
- Secondary Keywords: ${secondaryKeywords.join(', ')}
- Website Name: ${websiteInfo.websiteName}
- Website URL: ${websiteInfo.targetUrl}
- Website Description: ${websiteInfo.websiteDescription}
- Target Audience: ${websiteInfo.targetAudience || 'US professionals'}

CONTENT GUIDELINES:
1. Write for US professionals - use American English, US statistics, US-relevant examples
2. Opening paragraph: Start with a compelling US-relevant statistic or hook (2-3 sentences)
3. Include 5-7 main content sections (H2 headings)
4. Each section should be 150-250 words with substantive, actionable content
5. Include 3-4 "Pro Tips" distributed throughout the article
6. Add 2-3 external reference links to authoritative sources (Wikipedia, .edu, .gov, reputable publications)
7. FAQ section with 4-6 common questions and concise answers
8. Call-to-action section promoting ${websiteInfo.websiteName}

OUTPUT FORMAT (return ONLY this JSON structure):
{
  "title": "Article title with keyword",
  "metaDescription": "150-160 character meta description with keyword",
  "openingParagraph": "Compelling opening with US statistic/hook, 2-3 sentences",
  "keyTakeaways": [
    { "point": "Key point title", "details": "Brief explanation of this takeaway" }
  ],
  "sections": [
    {
      "heading": "Section H2 Heading",
      "content": "Full section content with multiple paragraphs separated by double newlines. Include external links in markdown format [text](url).",
      "proTip": "Optional pro tip for this section (or null)"
    }
  ],
  "callToAction": {
    "heading": "CTA heading mentioning ${websiteInfo.websiteName}",
    "content": "Compelling CTA content explaining how ${websiteInfo.websiteName} solves the reader's problem"
  },
  "faq": [
    { "question": "Common question about the topic?", "answer": "Concise, helpful answer" }
  ],
  "recommendedLinks": [
    { "title": "Related resource title", "url": "https://example.com" }
  ],
  "heroImagePrompt": "Detailed DALL-E prompt for hero image (professional, modern style)",
  "contentImagePrompts": [
    "DALL-E prompt for mid-article image illustrating a key concept"
  ]
}

Return ONLY the JSON object, no markdown formatting or explanations.`;
};

// ============================================
// Image Generation (DALL-E)
// ============================================

/**
 * Generate an image using DALL-E
 * @param {number} userId - User ID
 * @param {string} prompt - Image description prompt
 * @returns {string} Generated image URL
 */
const generateImage = async (userId, prompt) => {
  try {
    console.log(`🎨 Generating image: ${prompt.substring(0, 50)}...`);

    const apiKey = await getDecryptedApiKey(userId, 'openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: `Professional blog article image: ${prompt}. Style: clean, modern, professional, suitable for business blog. No text overlays.`,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const imageUrl = response.data.data[0].url;
    console.log(`✅ Image generated successfully`);
    return imageUrl;
  } catch (error) {
    console.error('❌ Error generating image:', error.message);
    // Return null instead of throwing - article can still be useful without images
    return null;
  }
};

/**
 * Generate all images for an article
 * @param {number} userId - User ID
 * @param {object} articleContent - Article content with image prompts
 * @returns {object} { heroImage, contentImages }
 */
const generateArticleImages = async (userId, articleContent) => {
  const images = {
    heroImage: null,
    contentImages: [],
  };

  try {
    // Generate hero image
    if (articleContent.heroImagePrompt) {
      images.heroImage = await generateImage(userId, articleContent.heroImagePrompt);
    }

    // Generate content images (limit to 2 to manage costs)
    const contentPrompts = (articleContent.contentImagePrompts || []).slice(0, 2);
    for (const prompt of contentPrompts) {
      const imageUrl = await generateImage(userId, prompt);
      if (imageUrl) {
        images.contentImages.push(imageUrl);
      }
      // Small delay between image generations
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Error generating article images:', error.message);
  }

  return images;
};

// ============================================
// AI Provider Functions
// ============================================

/**
 * Generate content using OpenAI
 */
const generateWithOpenAI = async (userId, prompt, model = 'gpt-4o') => {
  const apiKey = await getDecryptedApiKey(userId, 'openai');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
  }

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: model,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert SEO content writer specializing in creating high-quality, engaging blog articles for US professional audiences. Always output valid JSON when requested.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  );

  return {
    message: response.data.choices[0].message.content.trim(),
    tokens_used: response.data.usage?.total_tokens || 0,
    model: model,
  };
};

/**
 * Generate content using Claude
 */
const generateWithClaude = async (userId, prompt) => {
  const apiKey = await getDecryptedApiKey(userId, 'claude');
  if (!apiKey) {
    throw new Error('Claude API key not configured. Please add your API key in Settings.');
  }

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system:
        'You are an expert SEO content writer specializing in creating high-quality, engaging blog articles for US professional audiences. Always output valid JSON when requested.',
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
      timeout: 120000,
    }
  );

  return {
    message: response.data.content[0].text.trim(),
    tokens_used:
      (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
    model: 'claude-3-5-sonnet',
  };
};

/**
 * Generate content using Gemini
 */
const generateWithGemini = async (userId, prompt) => {
  const apiKey = await getDecryptedApiKey(userId, 'gemini');
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add your API key in Settings.');
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      contents: [
        {
          parts: [
            {
              text: `You are an expert SEO content writer. ${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    },
    {
      timeout: 120000,
    }
  );

  return {
    message: response.data.candidates[0].content.parts[0].text.trim(),
    tokens_used: response.data.usageMetadata?.totalTokenCount || 0,
    model: 'gemini-1.5-pro',
  };
};

// ============================================
// Database Operations
// ============================================

/**
 * Create or update an article campaign
 */
const createCampaign = async (websiteId, userId, campaignData) => {
  const {
    targetUrl,
    websiteName,
    websiteDescription,
    targetAudience,
    autoKeywords,
    customKeywords,
  } = campaignData;

  const result = await pool.query(
    `INSERT INTO article_campaigns
      (website_id, user_id, target_url, website_name, website_description, target_audience, auto_keywords, custom_keywords)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (website_id)
     DO UPDATE SET
       target_url = $3,
       website_name = $4,
       website_description = $5,
       target_audience = $6,
       auto_keywords = $7,
       custom_keywords = $8,
       updated_at = NOW()
     RETURNING *`,
    [
      websiteId,
      userId,
      targetUrl,
      websiteName,
      websiteDescription,
      targetAudience,
      autoKeywords || [],
      customKeywords || [],
    ]
  );

  return result.rows[0];
};

/**
 * Get campaign for a website
 */
const getCampaign = async (websiteId) => {
  const result = await pool.query('SELECT * FROM article_campaigns WHERE website_id = $1', [
    websiteId,
  ]);
  return result.rows[0] || null;
};

/**
 * Update campaign keywords
 */
const updateCampaignKeywords = async (campaignId, autoKeywords, customKeywords) => {
  const result = await pool.query(
    `UPDATE article_campaigns
     SET auto_keywords = $2, custom_keywords = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [campaignId, autoKeywords, customKeywords]
  );
  return result.rows[0];
};

/**
 * Save generated article to database
 */
const saveArticle = async (campaignId, websiteId, userId, articleData) => {
  const {
    title,
    metaDescription,
    htmlContent,
    targetKeyword,
    secondaryKeywords,
    wordCount,
    provider,
    tokensUsed,
    generationTimeMs,
    heroImageUrl,
    contentImages,
    articleMetadata,
  } = articleData;

  const slug = generateSlug(title);

  const result = await pool.query(
    `INSERT INTO generated_articles
      (campaign_id, website_id, user_id, title, slug, meta_description, html_content,
       target_keyword, secondary_keywords, word_count, generation_provider, tokens_used,
       generation_time_ms, images_generated, hero_image_url, content_images, article_metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      campaignId,
      websiteId,
      userId,
      title,
      slug,
      metaDescription,
      htmlContent,
      targetKeyword,
      secondaryKeywords || [],
      wordCount,
      provider,
      tokensUsed,
      generationTimeMs,
      (contentImages?.length || 0) + (heroImageUrl ? 1 : 0),
      heroImageUrl,
      JSON.stringify(contentImages || []),
      JSON.stringify(articleMetadata || {}),
    ]
  );

  // Update campaign stats
  await pool.query(
    `UPDATE article_campaigns
     SET last_article_date = NOW(), total_articles_generated = total_articles_generated + 1
     WHERE id = $1`,
    [campaignId]
  );

  // Track usage
  const monthYear = new Date().toISOString().slice(0, 7);
  await pool.query(
    `INSERT INTO article_generation_usage (user_id, month_year, articles_generated, tokens_used, images_generated)
     VALUES ($1, $2, 1, $3, $4)
     ON CONFLICT (user_id, month_year)
     DO UPDATE SET
       articles_generated = article_generation_usage.articles_generated + 1,
       tokens_used = article_generation_usage.tokens_used + $3,
       images_generated = article_generation_usage.images_generated + $4,
       updated_at = NOW()`,
    [userId, monthYear, tokensUsed || 0, (contentImages?.length || 0) + (heroImageUrl ? 1 : 0)]
  );

  return result.rows[0];
};

/**
 * Get articles for a website with pagination
 */
const getArticles = async (websiteId, limit = 20, offset = 0) => {
  const result = await pool.query(
    `SELECT id, title, slug, meta_description, target_keyword, word_count,
            generation_provider, status, hero_image_url, created_at
     FROM generated_articles
     WHERE website_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [websiteId, limit, offset]
  );

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM generated_articles WHERE website_id = $1',
    [websiteId]
  );

  return {
    articles: result.rows,
    total: parseInt(countResult.rows[0].count),
  };
};

/**
 * Get single article by ID
 */
const getArticleById = async (articleId, websiteId) => {
  const result = await pool.query(
    'SELECT * FROM generated_articles WHERE id = $1 AND website_id = $2',
    [articleId, websiteId]
  );
  return result.rows[0] || null;
};

/**
 * Get previously generated topics for a campaign
 */
const getPreviousTopics = async (campaignId) => {
  const result = await pool.query(
    'SELECT title FROM generated_articles WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT 50',
    [campaignId]
  );
  return result.rows.map((row) => row.title);
};

/**
 * Delete an article
 */
const deleteArticle = async (articleId, websiteId) => {
  const result = await pool.query(
    'DELETE FROM generated_articles WHERE id = $1 AND website_id = $2 RETURNING id',
    [articleId, websiteId]
  );
  return result.rows.length > 0;
};

/**
 * Get usage stats for a user
 */
const getUsageStats = async (userId) => {
  const monthYear = new Date().toISOString().slice(0, 7);
  const result = await pool.query(
    'SELECT * FROM article_generation_usage WHERE user_id = $1 AND month_year = $2',
    [userId, monthYear]
  );
  return (
    result.rows[0] || {
      articles_generated: 0,
      tokens_used: 0,
      images_generated: 0,
    }
  );
};

// ============================================
// Main Generation Flow
// ============================================

/**
 * Main function to generate a complete article
 * @param {number} userId - User ID
 * @param {number} websiteId - Website ID
 * @param {string} provider - AI provider
 * @returns {object} Generated article
 */
const generateFullArticle = async (userId, websiteId, provider = 'openai') => {
  console.log(`\n🚀 Starting article generation for website ${websiteId}`);

  // Get campaign
  const campaign = await getCampaign(websiteId);
  if (!campaign) {
    throw new Error('No article campaign found. Please set up the article generator first.');
  }

  const websiteInfo = {
    websiteName: campaign.website_name,
    websiteDescription: campaign.website_description,
    targetAudience: campaign.target_audience,
    targetUrl: campaign.target_url,
  };

  // Combine keywords
  const allKeywords = [...(campaign.auto_keywords || []), ...(campaign.custom_keywords || [])];
  if (allKeywords.length === 0) {
    throw new Error('No keywords configured. Please add keywords to the campaign.');
  }

  // Get previous topics to avoid repetition
  const previousTopics = await getPreviousTopics(campaign.id);

  // Generate topic
  const { topic, targetKeyword, secondaryKeywords } = await generateArticleTopic(
    userId,
    allKeywords,
    previousTopics,
    websiteInfo
  );

  console.log(`📌 Topic: ${topic}`);
  console.log(`🎯 Target Keyword: ${targetKeyword}`);

  // Generate article content
  const articleContent = await generateArticleContent(
    userId,
    topic,
    targetKeyword,
    secondaryKeywords,
    websiteInfo,
    provider
  );

  // Generate images
  console.log(`🎨 Generating images...`);
  const images = await generateArticleImages(userId, articleContent);

  // Add images to article content
  articleContent.heroImage = images.heroImage;
  articleContent.heroImageAlt = `${articleContent.title} - Professional illustration`;

  // Add content images to sections
  if (images.contentImages.length > 0 && articleContent.sections) {
    const midPoint = Math.floor(articleContent.sections.length / 2);
    if (articleContent.sections[midPoint]) {
      articleContent.sections[midPoint].image = images.contentImages[0];
      articleContent.sections[midPoint].imageAlt = articleContent.sections[midPoint].heading;
    }
  }

  // Generate HTML
  const htmlContent = generateArticleHtml(articleContent, websiteInfo);
  const wordCount = calculateWordCount(htmlContent);

  // Save to database
  const savedArticle = await saveArticle(campaign.id, websiteId, userId, {
    title: articleContent.title,
    metaDescription: articleContent.metaDescription,
    htmlContent: htmlContent,
    targetKeyword: targetKeyword,
    secondaryKeywords: secondaryKeywords,
    wordCount: wordCount,
    provider: provider,
    tokensUsed: articleContent.tokensUsed,
    generationTimeMs: articleContent.generationTimeMs,
    heroImageUrl: images.heroImage,
    contentImages: images.contentImages,
    articleMetadata: articleContent,
  });

  console.log(`\n✅ Article "${articleContent.title}" generated successfully!`);
  console.log(`   Word count: ${wordCount}`);
  console.log(`   Images: ${(images.contentImages?.length || 0) + (images.heroImage ? 1 : 0)}`);
  console.log(`   Tokens used: ${articleContent.tokensUsed}`);

  return savedArticle;
};

module.exports = {
  // URL Analysis
  analyzeWebsiteForKeywords,

  // Article Generation
  generateArticleTopic,
  generateArticleContent,
  generateFullArticle,
  generateArticleImages,
  generateImage,

  // Database Operations
  createCampaign,
  getCampaign,
  updateCampaignKeywords,
  saveArticle,
  getArticles,
  getArticleById,
  getPreviousTopics,
  deleteArticle,
  getUsageStats,
};
