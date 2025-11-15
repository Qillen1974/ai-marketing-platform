const axios = require('axios');

// Reddit API Service
// Discovers relevant Reddit communities based on keywords

const REDDIT_API_BASE = 'https://www.reddit.com';
const REDDIT_OAUTH_BASE = 'https://oauth.reddit.com';

/**
 * Get Reddit OAuth token using client credentials flow
 * @returns {string} Access token
 */
const getRedditToken = async () => {
  try {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      console.warn('⚠️  Reddit API credentials not configured');
      return null;
    }

    const auth = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AIMarketingPlatform/1.0',
        },
        timeout: 10000,
      }
    );

    console.log('✅ Reddit OAuth token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Error getting Reddit token:', error.message);
    return null;
  }
};

/**
 * Search for subreddits by keyword
 * @param {string} keyword - Keyword to search
 * @param {string} token - Reddit OAuth token
 * @returns {array} Array of subreddit objects
 */
const searchSubreddits = async (keyword, token) => {
  try {
    if (!token) {
      console.warn('⚠️  No Reddit token available, using public endpoint');
      return searchSubredditsPublic(keyword);
    }

    console.log(`🔍 Searching Reddit for subreddits: "${keyword}"`);

    const response = await axios.get(`${REDDIT_OAUTH_BASE}/subreddits/search`, {
      params: {
        q: keyword,
        limit: 20,
        sort: 'relevance',
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'AIMarketingPlatform/1.0',
      },
      timeout: 15000,
    });

    if (!response.data.data || !response.data.data.children) {
      console.log('No subreddits found');
      return [];
    }

    const subreddits = response.data.data.children.map((child) => {
      const data = child.data;
      return {
        name: data.display_name,
        displayName: data.title,
        description: data.public_description || 'No description available',
        subscribers: data.subscribers || 0,
        activeUsers: data.active_user_count || 0,
        subredditAge: Math.floor((Date.now() - data.created_utc * 1000) / (1000 * 60 * 60 * 24)),
        isPublic: data.public_traffic,
        subredditType: data.subreddit_type, // 'public', 'private', 'restricted'
        postingRestricted: data.restrict_posting || false,
        url: `https://reddit.com/r/${data.display_name}`,
        iconUrl: data.community_icon || data.icon_img || '',
        subscribers: data.subscribers,
      };
    });

    console.log(`✅ Found ${subreddits.length} subreddits for "${keyword}"`);
    return subreddits;
  } catch (error) {
    console.error('❌ Error searching subreddits:', error.message);
    return [];
  }
};

/**
 * Public search for subreddits (no auth required)
 * @param {string} keyword - Keyword to search
 * @returns {array} Array of subreddit objects
 */
const searchSubredditsPublic = async (keyword) => {
  try {
    console.log(`🔍 Searching Reddit (public) for: "${keyword}"`);

    const response = await axios.get(`${REDDIT_API_BASE}/subreddits/search.json`, {
      params: {
        q: keyword,
        limit: 20,
      },
      headers: {
        'User-Agent': 'AIMarketingPlatform/1.0',
      },
      timeout: 15000,
    });

    if (!response.data.data || !response.data.data.children) {
      return [];
    }

    const subreddits = response.data.data.children.map((child) => {
      const data = child.data;
      return {
        name: data.display_name,
        displayName: data.title,
        description: data.public_description || 'No description available',
        subscribers: data.subscribers || 0,
        activeUsers: data.active_user_count || 0,
        subredditAge: Math.floor((Date.now() - data.created_utc * 1000) / (1000 * 60 * 60 * 24)),
        isPublic: !data.private,
        subredditType: data.subreddit_type,
        postingRestricted: data.restrict_posting || false,
        url: `https://reddit.com/r/${data.display_name}`,
        iconUrl: data.community_icon || data.icon_img || '',
      };
    });

    console.log(`✅ Found ${subreddits.length} subreddits for "${keyword}"`);
    return subreddits;
  } catch (error) {
    console.error('❌ Error searching subreddits (public):', error.message);
    return [];
  }
};

/**
 * Get detailed subreddit information
 * @param {string} subredditName - Name of subreddit (without /r/)
 * @param {string} token - Reddit OAuth token
 * @returns {object} Detailed subreddit data
 */
const getSubredditInfo = async (subredditName, token) => {
  try {
    const endpoint = token
      ? `${REDDIT_OAUTH_BASE}/r/${subredditName}/about`
      : `${REDDIT_API_BASE}/r/${subredditName}/about.json`;

    const headers = {
      'User-Agent': 'AIMarketingPlatform/1.0',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.get(endpoint, {
      headers,
      timeout: 10000,
    });

    const data = response.data.data || response.data;

    return {
      name: data.display_name,
      displayName: data.title,
      description: data.public_description || '',
      subscribers: data.subscribers || 0,
      activeUsers: data.active_user_count || 0,
      subredditAge: Math.floor((Date.now() - data.created_utc * 1000) / (1000 * 60 * 60 * 24)),
      isPublic: !data.private,
      subredditType: data.subreddit_type,
      postingRestricted: data.restrict_posting || false,
      url: `https://reddit.com/r/${data.display_name}`,
      iconUrl: data.community_icon || data.icon_img || '',
      rules: data.rules || [],
    };
  } catch (error) {
    console.error(`❌ Error getting subreddit info for ${subredditName}:`, error.message);
    return null;
  }
};

/**
 * Get recent posts from subreddit to analyze activity
 * @param {string} subredditName - Name of subreddit
 * @returns {array} Recent posts
 */
const getSubredditPosts = async (subredditName) => {
  try {
    const response = await axios.get(`${REDDIT_API_BASE}/r/${subredditName}/new.json`, {
      params: {
        limit: 100,
      },
      headers: {
        'User-Agent': 'AIMarketingPlatform/1.0',
      },
      timeout: 10000,
    });

    if (!response.data.data || !response.data.data.children) {
      return [];
    }

    return response.data.data.children.map((child) => ({
      id: child.data.id,
      title: child.data.title,
      url: child.data.url,
      createdAt: new Date(child.data.created_utc * 1000),
      upvotes: child.data.ups,
      comments: child.data.num_comments,
      author: child.data.author,
    }));
  } catch (error) {
    console.error(`❌ Error getting posts from ${subredditName}:`, error.message);
    return [];
  }
};

/**
 * Calculate relevance score based on keyword match
 * @param {string} keyword - User's keyword
 * @param {string} subredditName - Subreddit name
 * @param {string} subredditDescription - Subreddit description
 * @returns {number} Relevance score 0-100
 */
const calculateRelevanceScore = (keyword, subredditName, subredditDescription) => {
  const keywordLower = keyword.toLowerCase();
  const nameLower = subredditName.toLowerCase();
  const descLower = (subredditDescription || '').toLowerCase();

  let score = 0;

  // Exact match in name (100 points)
  if (nameLower === keywordLower) {
    score = 100;
  }
  // Partial match in name (80 points)
  else if (nameLower.includes(keywordLower) || keywordLower.includes(nameLower)) {
    score = 80;
  }
  // Match in description (50 points)
  else if (descLower.includes(keywordLower)) {
    score = 50;
  }
  // Word boundary match (40 points)
  else if (new RegExp(`\\b${keywordLower}\\b`).test(descLower)) {
    score = 40;
  } else {
    score = 0;
  }

  return Math.min(score, 100);
};

/**
 * Calculate difficulty to post based on subreddit characteristics
 * @param {object} subreddit - Subreddit data
 * @returns {string} 'easy', 'medium', or 'difficult'
 */
const calculatePostingDifficulty = (subreddit) => {
  // Private or restricted communities are difficult
  if (!subreddit.isPublic || subreddit.postingRestricted) {
    return 'difficult';
  }

  // Very large subreddits are difficult
  if (subreddit.subscribers > 500000) {
    return 'difficult';
  }

  // Medium-sized subreddits
  if (subreddit.subscribers > 50000) {
    return 'medium';
  }

  // Small to medium niche communities are easy
  return 'easy';
};

/**
 * Discover Reddit communities for a set of keywords
 * @param {array} keywords - Array of keywords
 * @returns {array} Array of community opportunities
 */
const discoverRedditCommunities = async (keywords = []) => {
  try {
    if (!keywords || keywords.length === 0) {
      keywords = ['marketing', 'seo', 'digital marketing'];
    }

    console.log(`🔗 Discovering Reddit communities for keywords: ${keywords.join(', ')}`);

    const token = await getRedditToken();
    const communities = [];
    const seenSubreddits = new Set();

    // Search for each keyword
    for (const keyword of keywords.slice(0, 5)) {
      const subreddits = await searchSubreddits(keyword, token);

      for (const subreddit of subreddits) {
        if (seenSubreddits.has(subreddit.name)) {
          continue;
        }

        seenSubreddits.add(subreddit.name);

        // Get relevance score
        const relevanceScore = calculateRelevanceScore(keyword, subreddit.name, subreddit.description);

        // Skip if very low relevance
        if (relevanceScore < 20) {
          continue;
        }

        // Get posting difficulty
        const difficulty = calculatePostingDifficulty(subreddit);

        // Get recent activity
        const posts = await getSubredditPosts(subreddit.name);
        const avgPostsPerDay = posts.length / 30; // Rough estimate

        communities.push({
          subreddit_name: subreddit.name,
          display_name: subreddit.displayName,
          description: subreddit.description,
          subscribers: subreddit.subscribers,
          active_users: subreddit.activeUsers,
          relevance_score: relevanceScore,
          posting_allowed: !subreddit.postingRestricted,
          self_promotion_allowed: false, // Assume not allowed unless verified
          requires_karma: 0, // Would need additional API calls to determine
          subreddit_age_days: subreddit.subredditAge,
          avg_posts_per_day: avgPostsPerDay,
          reddit_url: subreddit.url,
          reddit_icon_url: subreddit.iconUrl,
          community_type: subreddit.subscribers > 100000 ? 'general' : 'niche',
          difficulty_to_post: difficulty,
        });
      }
    }

    console.log(`✅ Discovered ${communities.length} Reddit communities`);
    return communities;
  } catch (error) {
    console.error('❌ Error discovering Reddit communities:', error.message);
    return [];
  }
};

module.exports = {
  getRedditToken,
  searchSubreddits,
  searchSubredditsPublic,
  getSubredditInfo,
  getSubredditPosts,
  calculateRelevanceScore,
  calculatePostingDifficulty,
  discoverRedditCommunities,
};
