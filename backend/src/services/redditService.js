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
 * IMPROVEMENT A2: Added recency check to filter out dead communities
 * @param {string} subredditName - Name of subreddit
 * @returns {array} Recent posts, or empty array if community is inactive
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
      console.log(`⚠️ No recent posts in r/${subredditName}`);
      return [];
    }

    const posts = response.data.data.children.map((child) => ({
      id: child.data.id,
      title: child.data.title,
      url: child.data.url,
      createdAt: new Date(child.data.created_utc * 1000),
      upvotes: child.data.ups,
      comments: child.data.num_comments,
      author: child.data.author,
    }));

    // IMPROVEMENT A2: Check if community is actually active
    if (posts.length === 0) {
      console.log(`⚠️ No recent posts in r/${subredditName}`);
      return [];
    }

    const mostRecentPost = posts[0];
    const daysSinceLastPost = (Date.now() - mostRecentPost.createdAt) / (1000 * 60 * 60 * 24);

    // If last post is older than 30 days, community is likely dead
    if (daysSinceLastPost > 30) {
      console.log(`⚠️ r/${subredditName} is inactive (last post: ${daysSinceLastPost.toFixed(1)} days ago)`);
      return []; // Return empty = don't include this community
    }

    console.log(`✅ r/${subredditName} is active (last post: ${daysSinceLastPost.toFixed(1)} days ago)`);
    return posts;
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

        // IMPROVEMENT A3: Calculate posts per day correctly
        // Only count posts from last 7 days (not dividing 100 by 30)
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const recentPosts = posts.filter(post => post.createdAt.getTime() >= sevenDaysAgo);
        const avgPostsPerDay = recentPosts.length > 0 ? recentPosts.length / 7 : 0; // Real calculation!

        // Skip communities with no activity in last 7 days (already filtered by getSubredditPosts, but double-check)
        if (posts.length === 0) {
          console.log(`⏭️  Skipping r/${subreddit.name}: no recent posts`);
          continue;
        }

        const lastPostDate = posts.length > 0 ? posts[0].createdAt : new Date();

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
          avg_posts_per_day: Math.round(avgPostsPerDay * 10) / 10, // Round to 1 decimal place
          last_post_date: lastPostDate, // NEW: track this for verification
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

/**
 * Get recent threads from a subreddit (last 7 days, sorted by new)
 * @param {string} subredditName - Name of subreddit (without /r/)
 * @param {number} limit - Number of threads to fetch (default 50)
 * @returns {array} Array of recent threads
 */
const getRecentThreads = async (subredditName, limit = 50) => {
  try {
    console.log(`🔍 Fetching recent threads from r/${subredditName}...`);

    const response = await axios.get(`${REDDIT_API_BASE}/r/${subredditName}/new.json`, {
      params: {
        limit: Math.min(limit, 100), // Reddit API limit is 100 per request
      },
      headers: {
        'User-Agent': 'AIMarketingPlatform/1.0',
      },
      timeout: 10000,
    });

    if (!response.data.data || !response.data.data.children) {
      return [];
    }

    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Filter for threads from last 7 days
    const threads = response.data.data.children
      .filter((child) => {
        const postedTime = child.data.created_utc * 1000;
        return postedTime > sevenDaysAgo;
      })
      .map((child) => {
        const data = child.data;
        return {
          thread_id: data.id,
          thread_title: data.title,
          thread_url: `https://reddit.com${data.permalink}`,
          author: data.author,
          upvotes: data.ups || 0,
          comments_count: data.num_comments || 0,
          posted_date: new Date(data.created_utc * 1000),
          is_self_post: data.is_self,
          selftext: data.selftext || '',
        };
      });

    console.log(`✅ Found ${threads.length} threads from last 7 days in r/${subredditName}`);
    return threads;
  } catch (error) {
    console.error(`❌ Error getting threads from ${subredditName}:`, error.message);
    return [];
  }
};

/**
 * Calculate thread relevance score based on keyword matches
 * @param {string} threadTitle - Thread title
 * @param {string} threadText - Thread content/selftext
 * @param {array} keywords - User's keywords to match
 * @returns {object} { relevanceScore: number, matchedKeywords: array }
 */
const calculateThreadRelevance = (threadTitle, threadText, keywords = []) => {
  if (!keywords || keywords.length === 0) {
    return { relevanceScore: 0, matchedKeywords: [] };
  }

  const titleLower = threadTitle.toLowerCase();
  const textLower = (threadText || '').toLowerCase();
  let matchCount = 0;
  const matchedKeywords = [];

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();

    // Title match (higher weight)
    if (titleLower.includes(keywordLower)) {
      matchCount += 2;
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
    // Content match (lower weight)
    else if (textLower.includes(keywordLower)) {
      matchCount += 1;
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  }

  // Calculate relevance score (0-100)
  // Max points: keywords.length * 2 (if all in title)
  const maxPoints = keywords.length * 2;
  const relevanceScore = Math.min(Math.round((matchCount / maxPoints) * 100), 100);

  return { relevanceScore, matchedKeywords };
};

/**
 * Discover relevant threads in tracked communities
 * @param {string} subredditName - Subreddit to search
 * @param {array} keywords - Keywords to match against thread titles
 * @returns {array} Threads with relevance scores
 */
const discoverThreadsInCommunity = async (subredditName, keywords = []) => {
  try {
    console.log(`🔗 Discovering threads in r/${subredditName} for keywords: ${keywords.join(', ')}`);

    // Get recent threads from the subreddit
    const threads = await getRecentThreads(subredditName, 50);

    if (threads.length === 0) {
      console.log(`⚠️  No recent threads found in r/${subredditName}`);
      return [];
    }

    // Calculate relevance for each thread
    const threadsWithRelevance = threads
      .map((thread) => {
        const { relevanceScore, matchedKeywords } = calculateThreadRelevance(
          thread.thread_title,
          thread.selftext,
          keywords
        );

        return {
          ...thread,
          relevance_score: relevanceScore,
          keyword_matches: matchedKeywords,
        };
      })
      // Filter out threads with no keyword matches
      .filter((thread) => thread.relevance_score > 0)
      // Sort by relevance and engagement
      .sort((a, b) => {
        // Primary: relevance score
        if (a.relevance_score !== b.relevance_score) {
          return b.relevance_score - a.relevance_score;
        }
        // Secondary: engagement (upvotes + comments)
        const engagementA = a.upvotes + a.comments_count;
        const engagementB = b.upvotes + b.comments_count;
        return engagementB - engagementA;
      });

    console.log(`✅ Found ${threadsWithRelevance.length} relevant threads in r/${subredditName}`);
    return threadsWithRelevance;
  } catch (error) {
    console.error(`❌ Error discovering threads in ${subredditName}:`, error.message);
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
  getRecentThreads,
  calculateThreadRelevance,
  discoverThreadsInCommunity,
};
